"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, AlertTriangle, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ShiftSummary {
    id: string;
    outletName: string;
    cashierName: string;
    openedAt: Date;
    closedAt: Date | null;
    status: "OPEN" | "CLOSED";
    expectedCash: number;
    expectedCard: number;
    expectedTransfer?: number;
    declaredCash: number;
    declaredCard: number;
    declaredTransfer?: number;
    isReconciled: boolean;
}

interface RevenueReconciliationTableProps {
    shifts: ShiftSummary[];
}

export function RevenueReconciliationTable({ shifts }: RevenueReconciliationTableProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const filteredShifts = shifts.filter(shift => {
        const matchesSearch =
            shift.outletName.toLowerCase().includes(search.toLowerCase()) ||
            shift.cashierName.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
            statusFilter === "ALL" ? true :
                statusFilter === "RECONCILED" ? shift.isReconciled :
                    statusFilter === "PENDING" ? !shift.isReconciled : true;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredShifts.length / itemsPerPage);
    const paginatedShifts = filteredShifts.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter]);
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle>Shift Reconciliations</CardTitle>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-[200px]">
                            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search Outlet, Cashier..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] h-9">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="RECONCILED">Reconciled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Outlet</TableHead>
                            <TableHead>Cashier</TableHead>
                            <TableHead className="text-right">Expected Revenue</TableHead>
                            <TableHead className="text-right">Declared Revenue</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedShifts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No shifts found needing reconciliation.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedShifts.map((shift) => {
                                const totalExpected = Number(shift.expectedCash) + Number(shift.expectedCard) + Number(shift.expectedTransfer || 0);
                                const totalDeclared = Number(shift.declaredCash) + Number(shift.declaredCard) + Number(shift.declaredTransfer || 0);
                                const variance = totalDeclared - totalExpected;

                                return (
                                    <TableRow key={shift.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{format(shift.openedAt, "MMM dd, yyyy")}</span>
                                                <span className="text-xs text-muted-foreground">{format(shift.openedAt, "h:mm a")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{shift.outletName}</TableCell>
                                        <TableCell>{shift.cashierName}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(totalExpected)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span>{formatCurrency(totalDeclared)}</span>
                                                {variance !== 0 && (
                                                    <span className={`text-xs ${variance > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {shift.isReconciled ? (
                                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Reconciled
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                                    <AlertTriangle className="w-3 h-3 mr-1" /> Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!shift.isReconciled && (
                                                <Link href={`/dashboard/business/revenue/${shift.id}`}>
                                                    <Button size="sm" variant="ghost">
                                                        Reconcile <ArrowRight className="w-4 h-4 ml-2" />
                                                    </Button>
                                                </Link>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
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
