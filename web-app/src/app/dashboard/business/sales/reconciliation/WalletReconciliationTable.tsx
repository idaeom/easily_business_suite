
"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { confirmWalletDeposit } from "@/actions/customer-ledger";
import { useRouter } from "next/navigation";

interface Deposit {
    id: string;
    date: Date;
    customerName: string;
    amount: number;
    method: string;
    accountName: string | undefined;
    reference: string;
}

export function WalletReconciliationTable({ deposits }: { deposits: Deposit[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleConfirm = async (id: string) => {
        setLoadingId(id);
        try {
            await confirmWalletDeposit(id);
            toast({ title: "Deposit Confirmed", description: "Customer wallet has been credited." });
            router.refresh(); // Refresh server data
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoadingId(null);
        }
    };

    if (deposits.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">All caught up! No pending deposits.</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Method/Bank</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {deposits.map((d) => (
                    <TableRow key={d.id}>
                        <TableCell>{formatDate(d.date)}</TableCell>
                        <TableCell className="font-medium">{d.customerName}</TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <Badge variant="outline" className="w-fit mb-1">{d.method}</Badge>
                                <span className="text-xs text-muted-foreground">{d.accountName}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.reference}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(d.amount)}</TableCell>
                        <TableCell className="text-right">
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleConfirm(d.id)}
                                disabled={loadingId === d.id}
                            >
                                {loadingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                Confirm
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
