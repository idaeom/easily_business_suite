"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUnifiedSalesReport, getReportOptions } from "@/actions/report";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function SalesReportPage() {
    const [data, setData] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [metrics, setMetrics] = useState({ grossSales: 0, refunds: 0, netSales: 0, count: 0 });
    const [loading, setLoading] = useState(true);

    // Options for filtering
    const [options, setOptions] = useState<{ outlets: any[], staff: any[], paymentMethods: any[] }>({ outlets: [], staff: [], paymentMethods: [] });

    // Filters
    const [search, setSearch] = useState("");
    const [type, setType] = useState<'ALL' | 'POS' | 'INVOICE'>("ALL");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [outletId, setOutletId] = useState<string>("all");
    const [createdById, setCreatedById] = useState<string>("all");
    const [paymentMethod, setPaymentMethod] = useState<string>("all");

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);

    const debouncedSearch = useDebounce(search, 500);

    // Initial Load for Options
    useEffect(() => {
        getReportOptions().then(setOptions).catch(console.error);
    }, []);

    // Load Data
    useEffect(() => {
        setLoading(true);
        getUnifiedSalesReport({
            page,
            limit,
            search: debouncedSearch,
            type,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            outletId: outletId === "all" ? undefined : outletId,
            createdById: createdById === "all" ? undefined : createdById,
            paymentMethod: paymentMethod === "all" ? undefined : paymentMethod,
        }).then(res => {
            setData(res.data);
            setMeta(res.meta);
            if (res.summary) setMetrics(res.summary);
        }).catch(err => {
            console.error(err);
        }).finally(() => {
            setLoading(false);
        });
    }, [page, limit, debouncedSearch, type, startDate, endDate, outletId, createdById, paymentMethod]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Sales & Revenue Report</h2>
                <p className="text-muted-foreground">Detailed overview of all transactions, refunds, and revenue metrics.</p>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Created Sales</CardDescription>
                        <CardTitle className="text-2xl">{formatCurrency(metrics.grossSales)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Refunds (Reversed)</CardDescription>
                        <CardTitle className="text-2xl text-red-600">{formatCurrency(metrics.refunds)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Net Revenue</CardDescription>
                        <CardTitle className="text-2xl text-green-600">{formatCurrency(metrics.netSales)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Transactions</CardDescription>
                        <CardTitle className="text-2xl">{metrics.count}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Controls */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        {/* Search */}
                        <div className="md:col-span-1 space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Search Reference/Customer</span>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        {/* Date Range - Flexible grid */}
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Start Date</span>
                            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">End Date</span>
                            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
                        </div>

                        {/* Source Filter */}
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Source Type</span>
                            <Select value={type} onValueChange={(val: any) => { setType(val); setPage(1); }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Sources</SelectItem>
                                    <SelectItem value="POS">Point of Sale</SelectItem>
                                    <SelectItem value="INVOICE">Invoices</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    {/* Advanced Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Outlet</span>
                            <Select value={outletId} onValueChange={(val) => { setOutletId(val); setPage(1); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Outlets" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Outlets</SelectItem>
                                    {options.outlets.map(o => (
                                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Personnel (Creator)</span>
                            <Select value={createdById} onValueChange={(val) => { setCreatedById(val); setPage(1); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Staff</SelectItem>
                                    {options.staff.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name || s.email || 'Unknown'}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Payment Method - Optional if we filtered by it, but nice to have */}
                        {/* TODO: Add Payment Method Filter Support in Backend if needed, currently not in query fully */}

                        {/* Pagination Limit */}
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Rows per page</span>
                            <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 Rows</SelectItem>
                                    <SelectItem value="20">20 Rows</SelectItem>
                                    <SelectItem value="50">50 Rows</SelectItem>
                                    <SelectItem value="100">100 Rows</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">Transaction Log</CardTitle>
                    <div className="text-xs text-muted-foreground">
                        Showing {data.length} of {meta.total} records
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Outlet / Staff</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Loading data...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No transactions found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow
                                        key={row.uniqueKey || row.reference}
                                        className={row.isRefund ? "bg-red-50 hover:bg-red-100" : ""}
                                    >
                                        <TableCell>{formatDate(row.date)}</TableCell>
                                        <TableCell className="font-mono text-xs font-medium">
                                            {row.reference.slice(0, 8)}...
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.type === "POS" ? "default" : "secondary"} className="text-[10px]">
                                                {row.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            <div>{row.outletName || '-'}</div>
                                            <div>{row.createdByName || '-'}</div>
                                        </TableCell>
                                        <TableCell>{row.customer}</TableCell>
                                        <TableCell>
                                            {row.isRefund ? (
                                                <Badge variant="destructive">REFUNDED</Badge>
                                            ) : (
                                                <Badge variant="outline">{row.status}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${row.isRefund ? "text-red-700" : ""}`}>
                                            {row.isRefund ? "-" : ""}{formatCurrency(row.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <div className="text-sm font-medium">
                            Page {page} of {meta.totalPages || 1}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={page >= meta.totalPages || loading}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Simple debounce hook locally to avoid import issues
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}
