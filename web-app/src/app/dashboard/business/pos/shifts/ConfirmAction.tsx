"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { confirmShiftReconciliation, confirmShiftDeposit } from "@/actions/pos";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

type ConfirmType = "reconciliation" | "deposit";

interface ConfirmDetails {
    label: string;
    amount: number;
    accountName?: string;
    expected?: number; // For reconciliation variance check
    actual?: number;
}

export function ConfirmAction({ id, type, details, disabled }: { id: string, type: ConfirmType, details: ConfirmDetails, disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleConfirm = async () => {
        setLoading(true);
        try {
            if (type === "reconciliation") {
                await confirmShiftReconciliation(id);
            } else {
                await confirmShiftDeposit(id);
            }
            toast({ title: "Confirmed successfully" });
            setOpen(false);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const variance = (details.actual || 0) - (details.expected || 0);
    const hasVariance = type === "reconciliation" && variance !== 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                    disabled={disabled}
                >
                    <Check className="h-3 w-3" /> Confirm
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Confirm Reconciliation</DialogTitle>
                    <DialogDescription>
                        Verify the funds are available in the destination account.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium capitalize">{type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reference/Method:</span>
                            <span className="font-medium">{details.label}</span>
                        </div>
                        {details.accountName && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Bank Account:</span>
                                <span className="font-medium text-blue-700">{details.accountName}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
                            <span>Amount to Confirm:</span>
                            <span>{formatCurrency(details.amount)}</span>
                        </div>
                    </div>

                    {hasVariance && (
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md flex gap-2 items-start text-sm text-yellow-800">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-bold">Attention: Variance Detected</p>
                                <p>Expected: {formatCurrency(details.expected || 0)}</p>
                                <p>Actual: {formatCurrency(details.actual || 0)}</p>
                                <p className="font-medium mt-1">Variance: {formatCurrency(variance)}</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={loading} className={hasVariance ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Funds
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
