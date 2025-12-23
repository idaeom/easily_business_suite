
"use client";

import { useState, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, ArrowUpRight, ArrowDownLeft } from "lucide-react";

type Account = {
    id: string;
    code: string; // Critical for COA
    name: string;
    type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
    balance: string; // Decimal string
    currency: string;
    description: string | null;
};

export function CoaTable({ accounts }: { accounts: Account[] }) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const filtered = accounts.filter(acc => {
        const matchesSearch =
            acc.name.toLowerCase().includes(search.toLowerCase()) ||
            acc.code.includes(search);
        const matchesType = typeFilter === "ALL" || acc.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedAccounts = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [search, typeFilter]);

    // Helper for formatting currency
    const formatCurrency = (amount: string, currency: string) => {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: currency
        }).format(Number(amount));
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "ASSET": return "bg-blue-100 text-blue-800 border-blue-200";
            case "LIABILITY": return "bg-red-100 text-red-800 border-red-200";
            case "EQUITY": return "bg-purple-100 text-purple-800 border-purple-200";
            case "INCOME": return "bg-green-100 text-green-800 border-green-200";
            case "EXPENSE": return "bg-orange-100 text-orange-800 border-orange-200";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search by code or name..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Accounts</SelectItem>
                            <SelectItem value="ASSET">Assets</SelectItem>
                            <SelectItem value="LIABILITY">Liabilities</SelectItem>
                            <SelectItem value="EQUITY">Equity</SelectItem>
                            <SelectItem value="INCOME">Income</SelectItem>
                            <SelectItem value="EXPENSE">Expenses</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {filtered.length} found
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-500" />
                        Master Chart of Accounts
                    </CardTitle>
                    <CardDescription>
                        Complete list of all GL accounts. Use this to verify double-entry postings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Code</TableHead>
                                <TableHead>Account Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedAccounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No accounts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedAccounts.map((acc) => (
                                    <TableRow key={acc.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono font-medium text-slate-700">
                                            {acc.code}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {acc.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getTypeColor(acc.type)}>
                                                {acc.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm max-w-[300px] truncate">
                                            {acc.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            {["ASSET", "EXPENSE"].includes(acc.type) ? (
                                                <span className={Number(acc.balance) < 0 ? "text-red-500" : "text-slate-700"}>
                                                    {formatCurrency(acc.balance, acc.currency)}
                                                </span>
                                            ) : (
                                                <span className={Number(acc.balance) < 0 ? "text-red-500" : "text-green-700"}>
                                                    {formatCurrency(acc.balance, acc.currency)}
                                                </span>
                                                // Note: Liabilities are Credit normal. Positive balance = Credit.
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm font-medium">Page {page} of {totalPages}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
