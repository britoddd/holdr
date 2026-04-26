"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewItemForm } from "@/components/new-item-form";
import { CategoryManager } from "@/components/category-manager";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { fetchMarketPrice, MarketPriceData, calculateSellability, getSellabilityLabel } from "@/lib/pricing";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Settings,
  Check,
  X,
  ImageOff,
} from "lucide-react";
import { Item } from "@/lib/types";
import { Image } from "next/image";

export default function Home() {
  const items = useStore((state) => state.items);
  const categories = useStore((state) => state.categories);
  const storagePlaces = useStore((state) => state.storagePlaces);
  const addItem = useStore((state) => state.addItem);
  const updateItem = useStore((state) => state.updateItem);
  const deleteItem = useStore((state) => state.deleteItem);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedStoragePlace, setSelectedStoragePlace] = useState<
    string | null
  >(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "qty">("name");

  const handleAddItem = (data: {
    name: string;
    description: string;
    quantity: number;
    category: string;
    storagePlace: string;
    dateOwned: string;
    usageFrequency: "Daily" | "Weekly" | "Monthly" | "Rarely" | "Never";
    imageUrl?: string;
  }) => {
    try {
      if (editingItem) {
        updateItem(editingItem.id, data);
        setNotification({
          type: "success",
          message: "Item updated successfully!",
        });
        setEditingItem(null);
      } else {
        addItem(data);
        setNotification({
          type: "success",
          message: "Item added successfully!",
        });
      }
      setShowAddForm(false);
    } catch (error) {
      setNotification({
        type: "error",
        message: "Failed to save item",
      });
      console.error("Failed to save item", error);
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleDeleteItem = (id: string) => {
    deleteItem(id);
    setDeleteConfirm(null);
  };

  const handleCancelForm = useCallback(() => {
    setShowAddForm(false);
    setEditingItem(null);
  }, []);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [confirmationAnswers, setConfirmationAnswers] = useState<
    Record<string, boolean>
  >({});
  const [marketData, setMarketData] = useState<
    Record<string, MarketPriceData>
  >({});
  const [unusedDecisions, setUnusedDecisions] = useState<
    Record<string, "sell" | "keep">
  >({});
  const [isConfirmationHidden, setIsConfirmationHidden] = useState(false);
  const [isUnusedItemsHidden, setIsUnusedItemsHidden] = useState(false);

  // Simple cache to avoid re-scraping the same query repeatedly
  const priceCacheRef = useRef<Map<string, MarketPriceData | null>>(new Map());

  // Calculate unused items (Rarely used + aged >40 days, or Never used)
  const getUnusedItems = () => {
    const now = new Date();

    const criteriaUnused = items.filter((item) => {
      const ownedDate = new Date(item.dateOwned);
      const daysDiff =
        (now.getTime() - ownedDate.getTime()) / (1000 * 60 * 60 * 24);

      if (item.usageFrequency === "Never") return true;
      if (item.usageFrequency === "Rarely" && daysDiff > 40) return true;
      return false;
    });

    const userFlaggedUnused = items.filter(
      (item) => confirmationAnswers[item.id] === false
    );

    // Merge and dedupe by id
    const merged = [...criteriaUnused, ...userFlaggedUnused];
    const deduped = Array.from(
      new Map(merged.map((item) => [item.id, item])).values()
    );
    return deduped;
  };

  // Get items that need confirmation (unused items not yet answered)
  const getItemsNeedingConfirmation = () => {
    return getUnusedItems().filter(
      (item) => confirmationAnswers[item.id] === undefined
    );
  };

  const handleConfirmationYes = (itemId: string) => {
    setConfirmationAnswers((prev) => ({
      ...prev,
      [itemId]: true,
    }));
  };

  const handleConfirmationNo = (itemId: string) => {
    setConfirmationAnswers((prev) => ({
      ...prev,
      [itemId]: false,
    }));
  };

  // Fetch market prices for unused items using scrape API
  useEffect(() => {
    const unused = getUnusedItems();
    const toFetch = unused.filter((it) => marketData[it.id] === undefined);
    if (toFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const it of toFetch) {
        const queryKey = `${it.name} ${it.category}`.trim().toLowerCase();
        try {
          let priceData: MarketPriceData | null;
          if (priceCacheRef.current.has(queryKey)) {
            priceData = priceCacheRef.current.get(queryKey) ?? null;
          } else {
            priceData = await fetchMarketPrice({
              name: it.name,
              category: it.category,
            });
            priceCacheRef.current.set(queryKey, priceData);
          }

          if (!cancelled && priceData) {
            setMarketData((prev) => ({ ...prev, [it.id]: priceData }));
          } else if (!cancelled) {
            setMarketData((prev) => ({
              ...prev,
              [it.id]: { bestPrice: null, items: [], averageSoldCount: 0, totalListings: 0 },
            }));
          }
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error("Failed to fetch market price", error);
          }
          if (!cancelled) {
            setMarketData((prev) => ({
              ...prev,
              [it.id]: { bestPrice: null, items: [], averageSoldCount: 0, totalListings: 0 },
            }));
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, confirmationAnswers]);

  const formatRupiah = (value: number | string | undefined) => {
    if (value === undefined || value === null) return "-";
    const n =
      typeof value === "number"
        ? value
        : Number(String(value).replace(/[^\d]/g, ""));
    if (!Number.isFinite(n)) return String(value);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  };

  useEffect(() => {
    if (showAddForm) {
      setIsModalVisible(true);
      return;
    }

    if (!isModalVisible) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsModalVisible(false);
    }, 520);

    return () => window.clearTimeout(timeout);
  }, [showAddForm, isModalVisible]);

  useEffect(() => {
    if (!showAddForm) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancelForm();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showAddForm, handleCancelForm]);

  useEffect(() => {
    if (!notification) return;

    const timeout = window.setTimeout(() => {
      setNotification(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [notification]);

  const filteredItems = items
    .filter((item) => {
      const categoryMatch =
        !selectedCategory || item.category === selectedCategory;
      const storageMatch =
        !selectedStoragePlace || item.storagePlace === selectedStoragePlace;
      return categoryMatch && storageMatch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date")
        return (
          new Date(b.dateOwned).getTime() - new Date(a.dateOwned).getTime()
        );
      if (sortBy === "qty") return b.quantity - a.quantity;
      return 0;
    });

  const getCategoryColor = (categoryName: string) => {
    return (
      categories.find((cat) => cat.name === categoryName)?.color || "#6366f1"
    );
  };

  const getStorageColor = (storageName: string) => {
    return (
      storagePlaces.find((place) => place.name === storageName)?.color ||
      "#94a3b8"
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center mt-10">
          <div>
            <h1 className="text-7xl font-bold mb-2">Holdr.</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your items and categories
            </p>
          </div>
          <Button
            onClick={() => setShowCategoryManager(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Categories
          </Button>
        </div>

        {/* Confirmation Segment - Do you still use these items? */}
        {getItemsNeedingConfirmation().length > 0 && (
          <Card className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 gap-3 py-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-yellow-900 dark:text-yellow-100">
                  Are you still using these items? (
                  {getItemsNeedingConfirmation().length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmationHidden(!isConfirmationHidden)}
                  className="text-yellow-900 dark:text-yellow-100"
                >
                  {isConfirmationHidden ? "Show" : "Hide"}
                </Button>
              </div>
            </CardHeader>
            {!isConfirmationHidden && (
              <CardContent>
                <div className="space-y-3">
                  {getItemsNeedingConfirmation().map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold">{item.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-40 sm:w-48">
                        <Button
                          onClick={() => handleConfirmationYes(item.id)}
                          variant="default"
                          size="sm"
                          className="w-full justify-center bg-green-500 hover:bg-green-600"
                        >
                          Yes
                        </Button>
                        <Button
                          onClick={() => handleConfirmationNo(item.id)}
                          variant="destructive"
                          size="sm"
                          className="w-full justify-center"
                        >
                          No
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Category Filter */}
        <div className="mb-3 flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            size="sm"
          >
            All Categories ({items.length})
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.name ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.name)}
              size="sm"
              className="flex items-center gap-2"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name} (
              {items.filter((item) => item.category === cat.name).length})
            </Button>
          ))}
        </div>

        {/* Storage Place & View/Sort Controls */}
        <div className="mb-6 flex gap-2 flex-wrap items-center justify-between">
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Storage:
            </span>
            <Button
              variant={selectedStoragePlace === null ? "default" : "outline"}
              onClick={() => setSelectedStoragePlace(null)}
              size="sm"
            >
              All ({items.length})
            </Button>
            {storagePlaces.map((place) => (
              <Button
                key={place.id}
                variant={
                  selectedStoragePlace === place.name ? "default" : "outline"
                }
                onClick={() => setSelectedStoragePlace(place.name)}
                size="sm"
                className="flex items-center gap-2"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: place.color }}
                />
                {place.name} (
                {
                  items.filter((item) => item.storagePlace === place.name)
                    .length
                }
                )
              </Button>
            ))}
          </div>

          {/* View Mode & Sort Selector */}
          <div className="flex gap-2 items-center">
            {/* View Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
                size="sm"
                className="px-2"
                title="Grid view"
              >
                ⊞
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                size="sm"
                className="px-2"
                title="List view"
              >
                ☰
              </Button>
            </div>

            {/* Sort Toggle */}
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={sortBy === "name" ? "default" : "ghost"}
                onClick={() => setSortBy("name")}
                size="sm"
                className="px-2 text-xs"
                title="Sort by name"
              >
                A-Z
              </Button>
              <Button
                variant={sortBy === "date" ? "default" : "ghost"}
                onClick={() => setSortBy("date")}
                size="sm"
                className="px-2 text-xs"
                title="Sort by date owned"
              >
                📅
              </Button>
              <Button
                variant={sortBy === "qty" ? "default" : "ghost"}
                onClick={() => setSortBy("qty")}
                size="sm"
                className="px-2 text-xs"
                title="Sort by quantity"
              >
                #
              </Button>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <Card
            className="p-12 text-center cursor-pointer"
            onClick={() => setShowAddForm(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                setShowAddForm(true);
                event.preventDefault();
              }
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">📦</div>
              <h3 className="text-xl font-semibold">No items yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Click to add your first item
              </p>
            </div>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Add New Item Card */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600"
              onClick={() => setShowAddForm(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  setShowAddForm(true);
                  event.preventDefault();
                }
              }}
            >
              <CardContent className="flex flex-col items-center justify-center h-full pt-12 pb-12">
                <div className="text-6xl mb-4">➕</div>
                <h3 className="text-lg font-semibold text-center mb-2">Create New Item</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Click to add a new item to your inventory
                </p>
              </CardContent>
            </Card>

            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteConfirm(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(item.category),
                      }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: getStorageColor(item.storagePlace),
                      }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {item.storagePlace}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="overflow-hidden rounded-md border bg-gray-50 dark:bg-gray-800">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="h-40 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                        <ImageOff className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold">Qty: {item.quantity}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {item.description || "No description"}
                  </p>
                  <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Owned since{" "}
                      {new Date(item.dateOwned).toLocaleDateString()}
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      {item.usageFrequency}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Add New Item Card for List View */}
            <Card 
              className="hover:shadow-sm transition-shadow cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600"
              onClick={() => setShowAddForm(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  setShowAddForm(true);
                  event.preventDefault();
                }
              }}
            >
              <CardContent className="p-4 flex items-center justify-center gap-4">
                <div className="text-5xl">➕</div>
                <div>
                  <h3 className="font-semibold">Create New Item</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to add a new item to your inventory
                  </p>
                </div>
              </CardContent>
            </Card>

            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-md overflow-hidden border bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-sm truncate">
                              {item.name}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: getCategoryColor(
                                  item.category
                                ),
                                color: "#fff",
                              }}
                            >
                              {item.category}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: getStorageColor(item.storagePlace),
                                }}
                              />
                              {item.storagePlace}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Qty: {item.quantity}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                            {item.description || "No description"}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-blue-500 hover:text-blue-700"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-700"
                            onClick={() => setDeleteConfirm(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <span className="text-blue-600 dark:text-blue-400">
                          {item.usageFrequency}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Unused Items Segment */}
        {(() => {
          const unusedItems = getUnusedItems().filter(
            (item) => confirmationAnswers[item.id] !== true
          );
          return unusedItems.length > 0 ? (
            <Card className="mt-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-red-900 dark:text-red-100">
                    Unused Items ({unusedItems.length})
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUnusedItemsHidden(!isUnusedItemsHidden)}
                    className="text-red-900 dark:text-red-100"
                  >
                    {isUnusedItemsHidden ? "Show" : "Hide"}
                  </Button>
                </div>
              </CardHeader>
              {!isUnusedItemsHidden && (
                <CardContent>
                <div className="space-y-4">
                  {unusedItems.map((item) => (
                    <Card
                      key={item.id}
                      className="hover:shadow-sm transition-shadow"
                    >
                      <CardContent className="pr-10">
                        <div className="flex items-start gap-4">
                          <div className="w-32 h-24 rounded-md overflow-hidden border bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <CardTitle className="text-base truncate">
                                    {item.name}
                                  </CardTitle>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: getCategoryColor(
                                        item.category
                                      ),
                                      color: "#fff",
                                    }}
                                  >
                                    {item.category}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{
                                        backgroundColor: getStorageColor(item.storagePlace),
                                      }}
                                    />
                                    {item.storagePlace}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Qty: {item.quantity}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {item.description || "No description"}
                                </p>
                              </div>
                              <div className="text-right ml-2">
                                <div className="text-xs text-gray-500 mb-1">
                                  Market price
                                </div>
                                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                                  {(() => {
                                    const data = marketData[item.id];
                                    if (!data) return "...";
                                    if (!data.bestPrice) return "N/A";
                                    return formatRupiah(data.bestPrice);
                                  })()}
                                </div>
                                {(() => {
                                  const data = marketData[item.id];
                                  if (!data || !data.bestPrice) return null;
                                  const sellability = calculateSellability(data.bestPrice, data.items);
                                  const label = getSellabilityLabel(sellability);
                                  return (
                                    <div className="mt-1 flex flex-col items-end gap-0.5">
                                      <div 
                                        className="text-xs font-semibold px-2 py-0.5 rounded"
                                        style={{ backgroundColor: label.color + '20', color: label.color }}
                                      >
                                        {label.text}
                                      </div>
                                      <div className="text-[10px] text-gray-500">
                                        ~{data.averageSoldCount} sold avg
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-end">
                              <div className="grid grid-cols-2 gap-2 w-44 sm:w-56">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleConfirmationYes(item.id);
                                    setUnusedDecisions((p) => ({
                                      ...p,
                                      [item.id]: "keep",
                                    }));
                                  }}
                                  className={
                                    "w-full justify-center " +
                                    (unusedDecisions[item.id] === "keep"
                                      ? "border-green-500 text-green-600"
                                      : "")
                                  }
                                >
                                  Keep
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    const query =
                                      `${item.name} ${item.category}`.trim();
                                    const url = `https://www.tokopedia.com/search?q=${encodeURIComponent(
                                      query
                                    )}`;
                                    window.open(url, "_blank");
                                    setUnusedDecisions((p) => ({
                                      ...p,
                                      [item.id]: "sell",
                                    }));
                                  }}
                                  className={
                                    "w-full justify-center " +
                                    (unusedDecisions[item.id] === "sell"
                                      ? "ring-1 ring-red-400"
                                      : "")
                                  }
                                >
                                  Sell
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
              )}
            </Card>
          ) : null;
        })()}

        {/* Floating Add Button */}
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => setShowAddForm(true)}
            className="h-20 w-20 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            size="icon"
          >
            <Plus className="h-10 w-10" />
          </Button>
        </div>

        {/* Add/Edit Item Modal */}
        {isModalVisible && (
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-500 ${
              showAddForm ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div
              className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-transform duration-500 ${
                showAddForm
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-3 scale-95 opacity-0"
              }`}
            >
              <NewItemForm
                onSubmit={handleAddItem}
                onCancel={handleCancelForm}
                editItem={editingItem || undefined}
              />
            </div>
          </div>
        )}

        {/* Category Manager */}
        <CategoryManager
          open={showCategoryManager}
          onOpenChange={setShowCategoryManager}
        />

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteConfirm !== null}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
          title="Delete Item"
          description="Are you sure you want to delete this item? This action cannot be undone."
          onConfirm={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
          confirmText="Delete"
          variant="destructive"
        />

        {/* Notification */}
        {notification && (
          <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-4">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${
                notification.type === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {notification.type === "success" ? (
                <Check className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
