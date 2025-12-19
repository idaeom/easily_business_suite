"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { getExpenseCategories, createExpenseCategory, deleteExpenseCategory } from "@/app/actions";

export function ExpenseCategoriesSettings() {
    const [categories, setCategories] = useState<any[]>([]);
    const [newCategory, setNewCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        const data = await getExpenseCategories();
        setCategories(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        setIsAdding(true);
        await createExpenseCategory(newCategory);
        setNewCategory("");
        await loadCategories();
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this category?")) {
            await deleteExpenseCategory(id);
            await loadCategories();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="New Category Name"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <Button onClick={handleAdd} disabled={isAdding || !newCategory.trim()}>
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Add
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                    <div className="space-y-2">
                        {categories.map((category) => (
                            <div key={category.id} className="flex items-center justify-between p-2 border rounded-md bg-white dark:bg-black">
                                <span>{category.name}</span>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div className="text-center text-muted-foreground py-4">No categories found.</div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
