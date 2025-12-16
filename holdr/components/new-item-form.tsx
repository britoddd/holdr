"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { recognizeItem } from "@/lib/api";
import { useState, useEffect } from "react";
import { Item } from "@/lib/types";

type UsageFrequencyType = "Daily" | "Weekly" | "Monthly" | "Rarely" | "Never";

type NewItemFormProps = {
  onSubmit?: (data: {
    name: string;
    description: string;
    quantity: number;
    category: string;
    storagePlace: string;
    dateOwned: string;
    usageFrequency: UsageFrequencyType;
    imageUrl?: string;
  }) => void;
  onCancel?: () => void;
  title?: string;
  className?: string;
  editItem?: Item;
};

export function NewItemForm({
  onSubmit,
  onCancel,
  title,
  className,
  editItem,
}: NewItemFormProps) {
  const categories = useStore((state) => state.categories);
  const storagePlaces = useStore((state) => state.storagePlaces);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    editItem?.category || ""
  );
  const [selectedStorage, setSelectedStorage] = useState<string>(
    editItem?.storagePlace || ""
  );
  const [name, setName] = useState(editItem?.name || "");
  const [description, setDescription] = useState(editItem?.description || "");
  const [quantity, setQuantity] = useState(editItem?.quantity || 1);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const addCategory = useStore((state) => state.addCategory);
  const [showNewStorage, setShowNewStorage] = useState(false);
  const [newStorageName, setNewStorageName] = useState("");
  const [newStorageColor, setNewStorageColor] = useState("#0ea5e9");
  const addStoragePlace = useStore((state) => state.addStoragePlace);
  const [dateOwned, setDateOwned] = useState<string>(
    editItem?.dateOwned || new Date().toISOString().split("T")[0]
  );
  const [usageFrequency, setUsageFrequency] = useState<UsageFrequencyType>(
    (editItem?.usageFrequency as UsageFrequencyType) || "Weekly"
  );
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    editItem?.imageUrl
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    label: string;
    category: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setDescription(editItem.description);
      setQuantity(editItem.quantity);
      setSelectedCategory(editItem.category);
      setSelectedStorage(editItem.storagePlace);
      setDateOwned(
        editItem.dateOwned || new Date().toISOString().split("T")[0]
      );
      setUsageFrequency(editItem.usageFrequency || "Weekly");
      setImageUrl(editItem.imageUrl);
    }
  }, [editItem]);

  const displayTitle = title || (editItem ? "Edit Item" : "Add Item");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = {
      name,
      description,
      quantity,
      category: selectedCategory || "Other",
      storagePlace: selectedStorage || "Other",
      dateOwned,
      usageFrequency,
      imageUrl,
    };

    try {
      console.log("Submitting item data:", data);
      if (onSubmit) {
        await onSubmit(data);
      }
      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error("Failed to submit item:", error);
      throw new Error("Failed to save item");
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory({
        name: newCategoryName,
        color: newCategoryColor,
      });
      setSelectedCategory(newCategoryName);
      setNewCategoryName("");
      setShowNewCategory(false);
    }
  };

  const handleAddStorage = () => {
    if (newStorageName.trim()) {
      addStoragePlace({
        name: newStorageName,
        color: newStorageColor,
      });
      setSelectedStorage(newStorageName);
      setNewStorageName("");
      setShowNewStorage(false);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setImageUrl(undefined);
      setSuggestions(null);
      return;
    }

    // Read file for preview
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);

    // Analyze image
    setIsAnalyzing(true);
    setSuggestions(null);
    setAnalysisError(null);

    try {
      const data = await recognizeItem(file);
      setSuggestions({
        label: data.label,
        category: data.category,
      });
      setAnalysisError(null);
    } catch (error) {
      console.error("Failed to analyze image:", error);
      setAnalysisError("Image analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestions = () => {
    if (suggestions) {
      if (suggestions.label && !name) {
        setName(suggestions.label);
      }
      if (suggestions.category) {
        setSelectedCategory(suggestions.category);
      }
      setSuggestions(null);
    }
  };

  return (
    <div className={className}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{displayTitle}</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image">Item Image</Label>
              <div className="relative w-full overflow-hidden rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <label htmlFor="image" className="block cursor-pointer">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Item preview"
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="h-64 w-full flex flex-col items-center justify-center gap-2 text-sm text-gray-500">
                      <span className="font-medium">
                        Click to upload an image
                      </span>
                      <span className="text-xs">PNG, JPG up to a few MB</span>
                    </div>
                  )}
                </label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] || null)
                  }
                />
                {imageUrl && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setImageUrl(undefined);
                        setSuggestions(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              {isAnalyzing && (
                <div className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  Analyzing image...
                </div>
              )}
              {analysisError && (
                <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <span className="font-semibold">Error:</span>
                  <span className="break-words">{analysisError}</span>
                </div>
              )}
              {suggestions && (
                <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950 space-y-2">
                  <p className="text-sm font-medium">AI Suggestions:</p>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {suggestions.label}
                    </p>
                    <p>
                      <span className="font-medium">Category:</span>{" "}
                      {suggestions.category}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={applySuggestions}
                    className="w-full"
                  >
                    Apply Suggestions
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="USB Cable"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => setShowNewCategory(!showNewCategory)}
                  >
                    + Add Custom Category
                  </Button>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage">Storage Place</Label>
              <Select
                value={selectedStorage}
                onValueChange={setSelectedStorage}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a storage place" />
                </SelectTrigger>
                <SelectContent>
                  {storagePlaces.map((place) => (
                    <SelectItem key={place.id} value={place.name}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: place.color }}
                        />
                        {place.name}
                      </span>
                    </SelectItem>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => setShowNewStorage(!showNewStorage)}
                  >
                    + Add Storage Place
                  </Button>
                </SelectContent>
              </Select>
            </div>

            {showNewStorage && (
              <div className="space-y-2 p-3 border rounded-md">
                <Label htmlFor="newStorage">New Storage Name</Label>
                <Input
                  id="newStorage"
                  value={newStorageName}
                  onChange={(e) => setNewStorageName(e.target.value)}
                  placeholder="Enter storage location"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="storageColor">Color</Label>
                  <input
                    type="color"
                    id="storageColor"
                    value={newStorageColor}
                    onChange={(e) => setNewStorageColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddStorage}
                  className="w-full"
                  size="sm"
                >
                  Create Storage Place
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dateOwned">Date Owned</Label>
              <Input
                id="dateOwned"
                name="dateOwned"
                type="date"
                required
                value={dateOwned}
                onChange={(e) => setDateOwned(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageFrequency">Usage Frequency</Label>
              <Select
                value={usageFrequency}
                onValueChange={(value) =>
                  setUsageFrequency(value as UsageFrequencyType)
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Rarely">Rarely</SelectItem>
                  <SelectItem value="Never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showNewCategory && (
              <div className="space-y-2 p-3 border rounded-md">
                <Label htmlFor="newCategory">New Category Name</Label>
                <Input
                  id="newCategory"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="categoryColor">Color</Label>
                  <input
                    type="color"
                    id="categoryColor"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full"
                  size="sm"
                >
                  Create Category
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optional, like your optimism"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="image">Item Image</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
                {imageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setImageUrl(undefined)}
                  >
                    Clear
                  </Button>
                )}
              </div>
              {imageUrl && (
                <div className="mt-2 border rounded-md p-2">
                  <img
                    src={imageUrl}
                    alt="Item preview"
                    className="max-h-40 object-contain mx-auto"
                  />
                </div>
              )}
            </div> */}

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editItem ? "Update Item" : "Save Item"}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
