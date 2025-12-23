"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { exportDataToExcel } from "@/lib/export-utils";

interface ValuationItem {
    itemId: string;
    itemName: string;
    sku: string | null;
    category: string;
    outletName: string;
    quantity: string | number;
    costPrice: string | number;
    totalValue: number;
}

interface InventoryValuationTableProps {
    data: ValuationItem[];
    summary: {
        totalValue: number;
        totalItems: number;
    };
    outlets: { id: string; name: string }[];
}

export function InventoryValuationTable({ data, summary, outlets }: InventoryValuationTableProps) {
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [outletFilter, setOutletFilter] = useState("ALL");

    // Filter Logic
    const filteredData = data.filter(item => {
        const matchesSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) ||
            (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter;
        const matchesOutlet = outletFilter === "ALL" || item.outletName === outletFilter; // Note: Filtering usually done server side for outlet, but this is client filter for now

        return matchesSearch && matchesCategory && matchesOutlet;
    });

    // Recalculate Summary based on View
    const filteredSummary = filteredData.reduce((acc, item) => ({
        totalValue: acc.totalValue + Number(item.totalValue),
        totalItems: acc.totalItems + Number(item.quantity)
    }), { totalValue: 0, totalItems: 0 });

    const categories = Array.from(new Set(data.map(i => i.category)));

    const handleExport = () => {
        exportDataToExcel(
            filteredData.map(i => ({
                Item: i.itemName,
                SKU: i.sku || "-",
                Category: i.category,
                Outlet: i.outletName,
                Quantity: i.quantity,
                "Unit Cost": i.costPrice,
                "Total Value": i.totalValue
            })),
            "Inventory_Valuation_Report"
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{filteredSummary.totalValue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Based on Cost Price (COGS)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock Quantity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredSummary.totalItems.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Units across all filtered outlets</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 w-full md:w-auto">
                    <Input
                        placeholder="Search items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-[200px]"
                    />
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Categories</SelectItem>
                            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Outlet</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((item) => (
                            <TableRow key={item.itemId + item.outletName}>
                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                <TableCell>{item.sku || "-"}</TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell>{item.outletName}</TableCell>
                                <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell>
                                <TableCell className="text-right">₦{Number(item.costPrice).toLocaleString()}</TableCell>
                                <TableCell className="text-right font-bold">₦{Number(item.totalValue).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
