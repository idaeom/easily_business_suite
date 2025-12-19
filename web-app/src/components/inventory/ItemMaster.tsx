"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Package, Briefcase, Wrench, Factory } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createItem } from "@/actions/inventory";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Item {
    id: string;
    name: string;
    price: string;
    costPrice: string;
    category: string;
    itemType: "RESALE" | "INTERNAL_USE" | "SERVICE" | "MANUFACTURED" | "RAW_MATERIAL";
    sku?: string | null;
    minStockLevel?: number | null;
    quantity: string;
}

interface ItemMasterProps {
    items: Item[];
}

export function ItemMaster({ items }: ItemMasterProps) {
    const [open, setOpen] = useState(false);
    const [newItem, setNewItem] = useState<{
        name: string; price: string; costPrice: string; category: string;
        itemType: "RESALE" | "INTERNAL_USE" | "SERVICE" | "MANUFACTURED" | "RAW_MATERIAL";
        sku: string; minStockLevel: number;
    }>({
        name: "", price: "0", costPrice: "0", category: "General", itemType: "RESALE", sku: "", minStockLevel: 0
    });
    const { toast } = useToast();

    const handleCreate = async () => {
        try {
            await createItem({
                ...newItem,
                price: Number(newItem.price),
                costPrice: Number(newItem.costPrice)
            });
            toast({ title: "Success", description: "Item created successfully" });
            setOpen(false);
            setNewItem({ name: "", price: "0", costPrice: "0", category: "General", itemType: "RESALE", sku: "", minStockLevel: 0 });
        } catch (e) {
            toast({ title: "Error", description: "Failed to create item", variant: "destructive" });
        }
    };

    const resaleItems = items.filter(i => i.itemType === "RESALE");
    const serviceItems = items.filter(i => i.itemType === "SERVICE");
    const manufacturedItems = items.filter(i => i.itemType === "MANUFACTURED");
    const internalItems = items.filter(i => ["INTERNAL_USE", "RAW_MATERIAL"].includes(i.itemType));

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Item Master</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Item</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={newItem.itemType}
                                        onValueChange={(val: any) => setNewItem({ ...newItem, itemType: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RESALE">Resale Product</SelectItem>
                                            <SelectItem value="SERVICE">Service</SelectItem>
                                            <SelectItem value="MANUFACTURED">Manufactured</SelectItem>
                                            <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                                            <SelectItem value="INTERNAL_USE">Internal Use</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>SKU (Optional)</Label>
                                    <Input value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Price (Sales)</Label>
                                    <Input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cost Price</Label>
                                    <Input type="number" step="0.01" value={newItem.costPrice} onChange={e => setNewItem({ ...newItem, costPrice: e.target.value })} />
                                </div>
                            </div>
                            <Button className="w-full" onClick={handleCreate}>Save Item</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="all">All Items</TabsTrigger>
                    <TabsTrigger value="resale">Resale</TabsTrigger>
                    <TabsTrigger value="service">Services</TabsTrigger>
                    <TabsTrigger value="manufactured">Manufactured</TabsTrigger>
                    <TabsTrigger value="internal">Internal / Raw</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <ItemList items={items} />
                </TabsContent>
                <TabsContent value="resale" className="mt-4">
                    <ItemList items={resaleItems} />
                </TabsContent>
                <TabsContent value="service" className="mt-4">
                    <ItemList items={serviceItems} />
                </TabsContent>
                <TabsContent value="manufactured" className="mt-4">
                    <ItemList items={manufacturedItems} />
                </TabsContent>
                <TabsContent value="internal" className="mt-4">
                    <ItemList items={internalItems} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ItemList({ items }: { items: Item[] }) {
    if (items.length === 0) {
        return <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md">No items found.</div>;
    }
    return (
        <div className="rounded-md border bg-white">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="p-3 text-left font-medium">Name</th>
                        <th className="p-3 text-left font-medium">Category</th>
                        <th className="p-3 text-right font-medium">Stock</th>
                        <th className="p-3 text-right font-medium">Cost</th>
                        <th className="p-3 text-right font-medium">Price</th>
                        <th className="p-3 text-right font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50/50">
                            <td className="p-3 font-medium">
                                {item.name}
                                <span className="text-slate-400 text-xs ml-2">{item.sku}</span>
                                <Badge variant="outline" className="ml-2 text-[10px]">{item.itemType}</Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">{item.category}</td>
                            <td className="p-3 text-right font-mono text-xs">
                                {item.itemType === "SERVICE" ?
                                    <span className="text-muted-foreground">-</span> :
                                    Number(item.quantity).toFixed(2)
                                }
                            </td>
                            <td className="p-3 text-right">₦{Number(item.costPrice).toLocaleString()}</td>
                            <td className="p-3 text-right font-bold">₦{Number(item.price).toLocaleString()}</td>
                            <td className="p-3 text-right">
                                <Button variant="ghost" size="sm">Edit</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
