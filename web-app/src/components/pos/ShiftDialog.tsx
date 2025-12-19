"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openShift, closeShift, getShiftSummary } from "@/actions/pos";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useReactToPrint } from 'react-to-print';
import { ZReportPrint } from './ZReportPrint';
import { Printer } from 'lucide-react';

interface ShiftDialogProps {
    open: boolean;
    onClose: () => void;
    activeShift?: any;
    onShiftOpened: (shift: any) => void;
    onShiftClosed: () => void;
    userName?: string;
}

export default function ShiftDialog({ open, onClose, activeShift, onShiftOpened, onShiftClosed, userName = "Cashier" }: ShiftDialogProps) {
    const { toast } = useToast();
    const [startCash, setStartCash] = useState("0");
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [zReport, setZReport] = useState<any>(null);
    const [actuals, setActuals] = useState<Record<string, string>>({});

    // Print Ref
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Z-Report-${activeShift?.id}`
    });

    useEffect(() => {
        if (open && activeShift) {
            getShiftSummary(activeShift.id).then((res: any) => {
                if (res) {
                    // Extract Z-Report data if present
                    const { zReport: zData, ...paymentMethods } = res;
                    setSummary(paymentMethods);
                    setZReport(zData);

                    // Prefill actuals
                    const initialActuals: Record<string, string> = {};
                    Object.keys(paymentMethods).forEach(k => initialActuals[k] = paymentMethods[k].toString());
                    setActuals(initialActuals);
                }
            });
        }
    }, [open, activeShift]);

    const handleOpen = async () => {
        try {
            const res = await openShift(Number(startCash));
            toast({ title: "Shift Opened", description: "Good luck with sales!" });
            onShiftOpened(res.shift);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleClose = async () => {
        try {
            const payload: Record<string, number> = {};
            Object.keys(actuals).forEach(k => payload[k] = Number(actuals[k]));

            await closeShift(activeShift.id, payload);
            toast({ title: "Shift Closed", description: "Reconciliation Logged." });
            onShiftClosed();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>{activeShift ? "Close Shift & Reconciliation" : "Open New Shift"}</span>
                        <div className="flex gap-2">
                            <Link href="/dashboard/business/pos/shifts" onClick={onClose}>
                                <Button variant="ghost" size="sm">History</Button>
                            </Link>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {!activeShift ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Starting Cash in Drawer</Label>
                            <Input type="number" value={startCash} onChange={(e) => setStartCash(e.target.value)} />
                            <p className="text-xs text-muted-foreground">Enter the amount of float cash provided.</p>
                        </div>
                        <Button className="w-full" onClick={handleOpen}>Start Shift</Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                            ℹ️ Please count the cash and other payments. Enter the actual amounts below.
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {Object.keys(summary).sort().map(method => (
                                <div key={method} className="grid grid-cols-2 gap-4 items-center">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground uppercase">{method} Expected</Label>
                                        <div className="font-bold text-lg">{formatCurrency(summary[method])}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Actual Count</Label>
                                        <Input
                                            type="number"
                                            value={actuals[method] || ""}
                                            onChange={(e) => setActuals({ ...actuals, [method]: e.target.value })}
                                            className={Number(actuals[method]) !== summary[method] ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t">
                            <Button className="w-full" variant="destructive" onClick={handleClose}>
                                Confirm & Close Shift
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
