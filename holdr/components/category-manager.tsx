"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, ConfirmDialog } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { Trash2, GripVertical, Edit2, Plus } from "lucide-react";
import { Category } from "@/lib/types";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const categories = useStore((state) => state.categories);
  const addCategory = useStore((state) => state.addCategory);
  const deleteCategory = useStore((state) => state.deleteCategory);
  const updateCategory = useStore((state) => state.updateCategory);
  const reorderCategories = useStore((state) => state.reorderCategories);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddCategory = () => {
    if (newName.trim()) {
      addCategory({ name: newName, color: newColor });
      setNewName("");
      setNewColor("#3b82f6");
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      updateCategory(editingId, { name: editName, color: editColor });
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteCategory(id);
    setDeleteConfirm(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newCategories = [...categories];
    const draggedItem = newCategories[draggedIndex];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, draggedItem);

    reorderCategories(newCategories);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="max-h-[80vh] overflow-y-auto">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle>Manage Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Category */}
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Category
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="newCategoryName">Category Name</Label>
                    <Input
                      id="newCategoryName"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter category name"
                      onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="newCategoryColor">Color</Label>
                    <input
                      type="color"
                      id="newCategoryColor"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="h-10 w-20 cursor-pointer rounded border"
                    />
                  </div>
                  <Button onClick={handleAddCategory} className="w-full">
                    Add Category
                  </Button>
                </div>

                {/* Existing Categories */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    Existing Categories (Drag to reorder)
                  </h3>
                  {categories.map((cat, index) => (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 p-3 border rounded-lg bg-white dark:bg-gray-900 cursor-move hover:shadow-md transition-shadow ${
                        draggedIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      
                      {editingId === cat.id ? (
                        <>
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-8 w-12 cursor-pointer rounded border"
                          />
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                          />
                          <Button size="sm" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="flex-1 font-medium">{cat.name}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditCategory(cat)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirm(cat.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Category"
        description="Are you sure you want to delete this category? Items with this category will remain but won't have an associated category."
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
