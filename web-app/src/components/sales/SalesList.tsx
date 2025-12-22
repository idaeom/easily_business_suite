"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export function SalesList({ sales, view = "list" }: { sales: any[], view?: "list" | "card" }) {
    if (sales.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-slate-50 border-dashed text-slate-500">
                <p>No confirmed sales yet.</p>
            </div>
        );
    }

    if (view === "card") {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sales.map((sale) => (
                    <Card key={sale.id} className="overflow-hidden">
                        <CardHeader className="pb-2 border-b bg-muted/40 p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-mono text-xs text-muted-foreground mb-1">#{sale.id.slice(0, 8)}</div>
                                    <CardTitle className="text-base font-semibold">{sale.customerName}</CardTitle>
                                </div>
                                <Badge variant={sale.status === 'CONFIRMED' ? 'default' : 'secondary'} className={sale.status === 'CONFIRMED' ? "bg-green-600" : ""}>
                                    {sale.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-4">
                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium">{format(new Date(sale.saleDate), 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Items:</span>
                                    <span>{sale.items.length} Items</span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                    <span className="font-semibold text-muted-foreground">Total:</span>
                                    <span className="text-lg font-bold">₦{Number(sale.total).toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="px-6 py-4 border-b">
                <CardTitle className="text-base font-medium">Order History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-6">Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right pr-6">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell className="pl-6 font-medium">
                                    {format(new Date(sale.saleDate), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{sale.customerName}</span>
                                        <span className="text-xs text-muted-foreground">{sale.contact?.phone}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                    #{sale.id.slice(0, 8)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-normal">
                                        {sale.items.length} Items
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    ₦{Number(sale.total).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge variant={sale.status === 'CONFIRMED' ? 'default' : 'secondary'} className="bg-green-600 hover:bg-green-700">
                                        {sale.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
