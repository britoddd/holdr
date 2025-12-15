"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Item, Category, StoragePlace } from "./types";

type State = {
  items: Item[];
  categories: Category[];
  storagePlaces: StoragePlace[];
  addItem: (item: Omit<Item, "id" | "createdAt">) => void;
  updateItem: (id: string, item: Partial<Omit<Item, "id" | "createdAt">>) => void;
  deleteItem: (id: string) => void;
  addCategory: (category: Omit<Category, "id">) => void;
  updateCategory: (id: string, category: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (categories: Category[]) => void;
  addStoragePlace: (place: Omit<StoragePlace, "id">) => void;
  updateStoragePlace: (id: string, place: Partial<Omit<StoragePlace, "id">>) => void;
  deleteStoragePlace: (id: string) => void;
  reorderStoragePlaces: (places: StoragePlace[]) => void;
};

const defaultCategories: Category[] = [
  { id: "1", name: "Electronics", color: "#3b82f6" },
  { id: "2", name: "Office Supplies", color: "#10b981" },
  { id: "3", name: "Household", color: "#f59e0b" },
  { id: "4", name: "Tools", color: "#ef4444" },
  { id: "5", name: "Other", color: "#6366f1" },
];

const defaultStoragePlaces: StoragePlace[] = [
  { id: "s1", name: "Home Closet", color: "#14b8a6" },
  { id: "s2", name: "Office Shelf", color: "#8b5cf6" },
  { id: "s3", name: "Warehouse A", color: "#0ea5e9" },
  { id: "s4", name: "Garage", color: "#f97316" },
  { id: "s5", name: "Other", color: "#6b7280" },
];

export const useStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      categories: defaultCategories,
      storagePlaces: defaultStoragePlaces,
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              id: crypto.randomUUID(),
              createdAt: new Date(),
            },
          ],
        })),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      addCategory: (category) =>
        set((state) => ({
          categories: [
            ...state.categories,
            {
              ...category,
              id: crypto.randomUUID(),
            },
          ],
        })),
      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        })),
      reorderCategories: (categories) =>
        set(() => ({
          categories,
        })),
      addStoragePlace: (place) =>
        set((state) => ({
          storagePlaces: [
            ...state.storagePlaces,
            {
              ...place,
              id: crypto.randomUUID(),
            },
          ],
        })),
      updateStoragePlace: (id, updates) =>
        set((state) => ({
          storagePlaces: state.storagePlaces.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deleteStoragePlace: (id) =>
        set((state) => ({
          storagePlaces: state.storagePlaces.filter((p) => p.id !== id),
        })),
      reorderStoragePlaces: (places) =>
        set(() => ({
          storagePlaces: places,
        })),
    }),
    {
      name: "holdr-storage",
    }
  )
);
