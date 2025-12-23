"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface PayrollHistoryTableProps {
    runs: any[];
}

export function PayrollHistoryTable({ runs }: PayrollHistoryTableProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const filteredRuns = runs.filter(run => {
        const period = `${run.month}/${run.year}`;
        const matchesSearch = period.includes(search) ||
            run.year.toString().includes(search) ||
            run.month.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || run.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredRuns.length / itemsPerPage);
    const paginatedRuns = filteredRuns.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle>History</CardTitle>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-[200px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search Period (e.g. Dec, 2024)..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                            <SelectTrigger className="w-[120px] h-9">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRuns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    No payroll runs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRuns.map((run) => (
                                <TableRow key={run.id}>
                                    <TableCell className="font-medium">{run.month}/{run.year}</TableCell>
                                    <TableCell>
                                        <Badge variant={run.status === "PAID" ? "default" : run.status === "APPROVED" ? "secondary" : "outline"}>
                                            {run.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>₦{Number(run.totalAmount).toLocaleString()}</TableCell>
                                    <TableCell>{run.createdAt.toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/dashboard/hr/payroll/${run.id}`}>
                                            <Button size="sm" variant="ghost">
                                                View Details
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 pt-4">
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
            </CardContent>
        </Card>
    );
}
