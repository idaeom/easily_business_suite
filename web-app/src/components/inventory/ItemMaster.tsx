"use client";

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createItem, updateItem } from "@/actions/inventory";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { List, LayoutGrid, ChevronLeft, ChevronRight, Edit } from "lucide-react";

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
    outletPrices?: { outletId: string; price: string }[];
}

interface ItemMasterProps {
    items: Item[];
    categories?: any[];
    outlets?: any[];
    activeOutletId?: string;
}

export function ItemMaster({ items, categories = [], outlets = [], activeOutletId = "GLOBAL" }: ItemMasterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const initialForm = {
        name: "", price: "0", costPrice: "0", category: "", itemType: "RESALE" as const, sku: "", minStockLevel: 0,
        outletPrices: [] as { outletId: string; price: string }[]
    };
    const [newItem, setNewItem] = useState<{
        name: string; price: string; costPrice: string; category: string;
        itemType: "RESALE" | "INTERNAL_USE" | "SERVICE" | "MANUFACTURED" | "RAW_MATERIAL";
        sku: string; minStockLevel: number;
        outletPrices: { outletId: string; price: string }[];
    }>(initialForm);
    const { toast } = useToast();

    const handleOutletChange = (value: string) => {
        const params = new URLSearchParams();
        if (value && value !== "GLOBAL") {
            params.set("outletId", value);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleEdit = (item: Item) => {
        setEditingId(item.id);
        // Prepare outlet prices
        const prices = outlets.map(o => {
            const existing = item.outletPrices?.find(op => op.outletId === o.id);
            return {
                outletId: o.id,
                price: existing ? Number(existing.price).toFixed(2) : ""
            };
        });

        setNewItem({
            name: item.name,
            price: Number(item.price).toFixed(2),
            costPrice: Number(item.costPrice).toFixed(2),
            category: item.category,
            itemType: item.itemType,
            sku: item.sku || "",
            minStockLevel: item.minStockLevel || 0,
            outletPrices: prices
        });
        setOpen(true);
    };

    const openCreate = () => {
        setEditingId(null);
        setNewItem({
            ...initialForm,
            outletPrices: outlets.map(o => ({ outletId: o.id, price: "" }))
        });
        setOpen(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...newItem,
                price: Number(newItem.price),
                costPrice: Number(newItem.costPrice),
                outletPrices: newItem.outletPrices
                    .filter(p => p.price && p.price !== "")
                    .map(p => ({ outletId: p.outletId, price: Number(p.price) }))
            };

            if (editingId) {
                await updateItem(editingId, payload);
                toast({ title: "Success", description: "Item updated successfully" });
            } else {
                await createItem(payload);
                toast({ title: "Success", description: "Item created successfully" });
            }
            setOpen(false);
            setNewItem(initialForm);
            setEditingId(null);
        } catch (e) {
            toast({ title: "Error", description: "Failed to save item", variant: "destructive" });
        }
    };

    const resaleItems = items.filter(i => i.itemType === "RESALE");
    const serviceItems = items.filter(i => i.itemType === "SERVICE");
    const manufacturedItems = items.filter(i => i.itemType === "MANUFACTURED");
    const internalItems = items.filter(i => ["INTERNAL_USE", "RAW_MATERIAL"].includes(i.itemType));

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-medium">Item Master</h3>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={activeOutletId} onValueChange={handleOutletChange}>
                            <SelectTrigger className="w-[200px] h-8 text-xs">
                                <SelectValue placeholder="Filter by Outlet" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GLOBAL">Global View (All)</SelectItem>
                                {outlets.map(o => (
                                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Edit Item" : "Create New Item"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Input
                                        value={newItem.category}
                                        onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                        list="category-list"
                                        placeholder="Select or type..."
                                    />
                                    {categories && categories.length > 0 && (
                                        <datalist id="category-list">
                                            {categories.map((c: any) => (
                                                <option key={c.id} value={c.name} />
                                            ))}
                                        </datalist>
                                    )}
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
                                    <Label>Price (Base Sales)</Label>
                                    <Input type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cost Price</Label>
                                    <Input type="number" step="0.01" value={newItem.costPrice} onChange={e => setNewItem({ ...newItem, costPrice: e.target.value })} disabled={!!editingId} />
                                </div>
                            </div>

                            {/* Outlet Pricing Section */}
                            {outlets.length > 0 && newItem.itemType !== "INTERNAL_USE" && (
                                <div className="border-t pt-4 mt-4">
                                    <h4 className="text-sm font-medium mb-3">Outlet Specific Pricing</h4>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto px-1">
                                        {newItem.outletPrices.map((op, idx) => {
                                            const outletName = outlets.find(o => o.id === op.outletId)?.name || "Unknown";
                                            return (
                                                <div key={op.outletId} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-md">
                                                    <span>{outletName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Price:</span>
                                                        <Input
                                                            type="number"
                                                            className="w-28 h-8 text-right"
                                                            placeholder="Use Base"
                                                            value={op.price}
                                                            onChange={(e) => {
                                                                const newPrices = [...newItem.outletPrices];
                                                                newPrices[idx] = { ...newPrices[idx], price: e.target.value };
                                                                setNewItem({ ...newItem, outletPrices: newPrices });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2">Leave empty to use Base Price.</p>
                                </div>
                            )}

                            <Button className="w-full" onClick={handleSave}>
                                {editingId ? "Update Item" : "Create Item"}
                            </Button>
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
                    <ItemList items={items} onEdit={handleEdit} />
                </TabsContent>
                <TabsContent value="resale" className="mt-4">
                    <ItemList items={resaleItems} onEdit={handleEdit} />
                </TabsContent>
                <TabsContent value="service" className="mt-4">
                    <ItemList items={serviceItems} onEdit={handleEdit} />
                </TabsContent>
                <TabsContent value="manufactured" className="mt-4">
                    <ItemList items={manufacturedItems} onEdit={handleEdit} />
                </TabsContent>
                <TabsContent value="internal" className="mt-4">
                    <ItemList items={internalItems} onEdit={handleEdit} />
                </TabsContent>
            </Tabs>
        </div>
    );
}


function ItemList({ items, onEdit }: { items: Item[]; onEdit: (item: Item) => void }) {
    const [viewMode, setViewMode] = useState<"list" | "card">("list");
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const itemsPerPage = 8;

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Reset page when search changes
    React.useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    if (page > totalPages && totalPages > 0) {
        setPage(1);
    }

    if (items.length === 0) {
        return <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md">No items found.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-md border gap-4">
                <div className="flex items-center gap-2 flex-1">
                    <Input
                        placeholder="Search items by name or SKU..."
                        className="max-w-[300px] h-8 bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="text-sm font-medium text-muted-foreground ml-2 whitespace-nowrap">
                        Showing {paginatedItems.length} of {filteredItems.length} items
                    </span>
                </div>
                <div className="flex bg-white rounded border">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-none h-8 px-3 ${viewMode === "list" ? "bg-slate-100" : ""}`}
                        onClick={() => setViewMode("list")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <div className="w-[1px] bg-border my-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-none h-8 px-3 ${viewMode === "card" ? "bg-slate-100" : ""}`}
                        onClick={() => setViewMode("card")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {viewMode === "list" ? (
                <div className="rounded-md border bg-white overflow-hidden">
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
                            {paginatedItems.map(item => (
                                <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
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
                                    <td className="p-3 text-right font-bold">
                                        ₦{Number(item.price).toLocaleString()}
                                        {item.outletPrices && item.outletPrices.length > 0 && (
                                            <span className="text-[10px] ml-1 text-blue-600" title="Has outlet specific pricing">*</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>Edit</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {paginatedItems.map(item => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="p-4 flex flex-row justify-between items-start space-y-0">
                                <div className="space-y-1">
                                    <CardTitle className="text-base font-medium leading-none line-clamp-1" title={item.name}>
                                        {item.name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                </div>
                                {item.itemType !== "SERVICE" && (
                                    <Badge variant={Number(item.quantity) <= (item.minStockLevel || 0) ? "destructive" : "secondary"}>
                                        {Number(item.quantity).toFixed(0)}
                                    </Badge>
                                )}
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Price:</span>
                                    <span className="font-bold">₦{Number(item.price).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Cost: ₦{Number(item.costPrice).toLocaleString()}</span>
                                    <span>Type: {item.itemType}</span>
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onEdit(item)}>
                                    <Edit className="h-3 w-3 mr-2" /> Edit Details
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">Page {page} of {totalPages}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
