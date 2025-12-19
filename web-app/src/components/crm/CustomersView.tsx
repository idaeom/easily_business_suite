"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, LayoutGrid, List as ListIcon, User, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';

export interface CustomersViewProps {
    customers: any[];
    frequentCustomers: any[];
    basePath: string; // e.g. "/dashboard/business/customers" or "/dashboard/business/sales/customers"
}

export function CustomersView({ customers, frequentCustomers, basePath }: CustomersViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const initialQuery = searchParams?.get('q') || "";

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [debouncedQuery] = useDebounce(searchQuery, 300);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const searchString = searchParams?.toString();

    useEffect(() => {
        const params = new URLSearchParams(searchString ?? "");
        if (debouncedQuery) {
            params.set('q', debouncedQuery);
        } else {
            params.delete('q');
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, [debouncedQuery, pathname, router, searchString]);

    // Use customers directly as they are filtered by server
    const filteredCustomers = customers;

    // Pagination Logic
    const totalPages = Math.ceil(filteredCustomers.length / pageSize);
    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleFrequentSelect = (customerId: string) => {
        if (customerId) {
            router.push(`${basePath}/${customerId}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Customer
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                <div className="flex gap-2 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search customers..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    {/* Frequent Customers Dropdown */}
                    <Select onValueChange={handleFrequentSelect}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Frequent Customers" />
                        </SelectTrigger>
                        <SelectContent>
                            {frequentCustomers.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* View Toggles */}
                    <div className="flex border rounded-md">
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setViewMode('list')}
                            className="rounded-none rounded-l-md"
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setViewMode('grid')}
                            className="rounded-none rounded-r-md"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            {viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedCustomers.map((c: any) => (
                        <Link key={c.id} href={`${basePath}/${c.id}`}>
                            <Card className="hover:bg-slate-50 transition-colors h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium truncate pr-2">
                                        {c.name}
                                    </CardTitle>
                                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        ₦{Number(c.walletBalance || 0).toLocaleString()}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {c.phone || "No phone"}
                                    </p>
                                    <div className="mt-2 text-xs">
                                        <Badge variant={c.status === 'ACTIVE' ? "outline" : "secondary"}>{c.status || 'Active'}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedCustomers.map((c: any) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`${basePath}/${c.id}`} className="hover:underline">
                                                {c.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{c.phone}</div>
                                            <div className="text-xs text-muted-foreground">{c.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={Number(c.walletBalance) < 0 ? "text-red-500 font-medium" : "text-green-600 font-medium"}>
                                                ₦{Number(c.walletBalance || 0).toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{c.status || 'Active'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => router.push(`${basePath}/${c.id}`)}>
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {paginatedCustomers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground border rounded-md bg-slate-50">
                    No customers found.
                </div>
            )}

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
