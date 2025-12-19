
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getShiftSummary } from "@/actions/pos";
import { formatCurrency } from "@/lib/utils";
import { useReactToPrint } from 'react-to-print';
import { ZReportPrint } from './ZReportPrint';
import { Printer } from 'lucide-react';

interface ZReportDialogProps {
    open: boolean;
    onClose: () => void;
    shiftId?: string;
    userName?: string;
}

export default function ZReportDialog({ open, onClose, shiftId, userName = "Cashier" }: ZReportDialogProps) {
    const [zReport, setZReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Print Ref
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Z-Report-${shiftId}`
    });

    useEffect(() => {
        if (open && shiftId) {
            setLoading(true);
            getShiftSummary(shiftId).then((res: any) => {
                if (res && res.zReport) {
                    setZReport(res.zReport);
                }
            }).finally(() => setLoading(false));
        }
    }, [open, shiftId]);

    if (!shiftId) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>Z-Report Preview</span>
                        {zReport && (
                            <Button variant="outline" size="sm" onClick={() => handlePrint && handlePrint()}>
                                <Printer className="w-4 h-4 mr-2" />
                                Print
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading report data...</div>
                ) : zReport ? (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Gross Sales</span>
                                <span className="font-semibold">{formatCurrency(zReport.grossSales)}</span>
                            </div>
                            <div className="flex justify-between text-xs pl-2">
                                <span className="text-muted-foreground">- Tax Collected</span>
                                <span>{formatCurrency(zReport.totalTax)}</span>
                            </div>
                            <div className="flex justify-between text-xs pl-2">
                                <span className="text-muted-foreground">- Discounts</span>
                                <span>{formatCurrency(zReport.totalDiscount)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 mt-2">
                                <span className="font-bold">Net Sales</span>
                                <span className="font-bold">{formatCurrency(zReport.netSales)}</span>
                            </div>

                            <div className="py-2 border-dashed border-y my-2 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span>Cash Sales</span>
                                    <span>{formatCurrency(zReport.cashSales)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span>Transactions</span>
                                    <span>{zReport.transactionCount}</span>
                                </div>
                            </div>

                            <div className="bg-yellow-50 p-2 rounded border border-yellow-100 text-xs">
                                <div className="font-semibold mb-1">Cash Drawer Check</div>
                                <div className="flex justify-between">
                                    <span>Opening Float</span>
                                    <span>{formatCurrency(zReport.startCash)}</span>
                                </div>
                                <div className="flex justify-between font-bold mt-1">
                                    <span>Expected Cash</span>
                                    <span>{formatCurrency(zReport.expectedDrawer)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Hidden Print Component */}
                        <div style={{ display: "none" }}>
                            <ZReportPrint ref={printRef} data={zReport} user={userName} />
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-red-500">Failed to load report.</div>
                )}
            </DialogContent>
        </Dialog>
    );
}
