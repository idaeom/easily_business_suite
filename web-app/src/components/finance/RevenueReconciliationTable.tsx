"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

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
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Shift Reconciliations</CardTitle>
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
                        {shifts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No shifts found needing reconciliation.
                                </TableCell>
                            </TableRow>
                        ) : (
                            shifts.map((shift) => {
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
            </CardContent>
        </Card>
    );
}
