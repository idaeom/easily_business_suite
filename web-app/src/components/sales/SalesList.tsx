"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

export function SalesList({ sales }: { sales: any[] }) {
    if (sales.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-slate-50 border-dashed text-slate-500">
                <p>No confirmed sales yet.</p>
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
