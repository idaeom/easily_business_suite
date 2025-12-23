"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { getItemCategories, createItemCategory, deleteItemCategory } from "@/actions/setup-categories";
import { CategorySetupWizard } from "@/components/CategorySetupWizard";
import { Badge } from "@/components/ui/badge";

export function ProductCategoriesSettings() {
    const [categories, setCategories] = useState<any[]>([]);
    const [newCategory, setNewCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        const data = await getItemCategories();
        setCategories(data);
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        setIsAdding(true);
        await createItemCategory(newCategory);
        setNewCategory("");
        await loadCategories();
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this category?")) {
            await deleteItemCategory(id);
            await loadCategories();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    {/* Header handled by Page */}
                </div>
                <CategorySetupWizard />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Inventory Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add Custom Category..."
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
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {categories.map((category) => (
                                <div key={category.id} className="flex items-center justify-between p-3 border rounded-md bg-white dark:bg-black hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">{category.name}</span>
                                        {category.businessType && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                {category.businessType}
                                            </Badge>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} className="h-8 w-8 text-muted-foreground hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <div className="text-center text-muted-foreground py-8 border border-dashed rounded-md">
                                    No categories found. Use the Wizard to load presets.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
