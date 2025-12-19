
"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { closeShift, getShiftSummary, getBankAccounts } from "@/actions/pos";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function CloseShiftDialog({ shiftId, onComplete }: { shiftId: string, onComplete?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [summary, setSummary] = useState<Record<string, number>>({});
    const [actuals, setActuals] = useState<Record<string, string>>({});
    const [accounts, setAccounts] = useState<Record<string, string>>({}); // ID -> Name

    // Fetch Summary & Accounts on Open
    useEffect(() => {
        if (open) {
            Promise.all([
                getShiftSummary(shiftId),
                getBankAccounts()
            ]).then(([data, accs]) => {
                if (data) setSummary(data);
                const accMap: Record<string, string> = {};
                accs.forEach(a => accMap[a.id] = a.name);
                setAccounts(accMap);
            }).catch(console.error);
        }
    }, [open, shiftId]);

    const formatLabel = (code: string) => {
        if (!code.includes(":")) return code;
        const [method, accId] = code.split(":");
        const accName = accounts[accId] || "Unknown Account";
        return `${method} (${accName})`;
    };

    const handleActualChange = (code: string, value: string) => {
        setActuals(prev => ({ ...prev, [code]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!confirm("Are you sure you want to close this shift? This action cannot be undone.")) return;

        setLoading(true);
        try {
            const parsedActuals: Record<string, number> = {};
            Object.keys(summary).forEach(code => {
                parsedActuals[code] = Number(actuals[code] || 0);
            });
            // Also include methods that might not be in summary but are in actuals?
            // Usually we only care about reconciling sales.

            await closeShift(shiftId, parsedActuals);
            toast({ title: "Shift Closed Successfully" });
            setOpen(false);
            onComplete?.();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Close Shift
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Close Shift & Reconcile</DialogTitle>
                    <DialogDescription>
                        Enter actual amounts for each payment method/account to reconcile.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Method / Account</TableHead>
                                <TableHead className="text-right">Expected</TableHead>
                                <TableHead className="text-right">Actual</TableHead>
                                <TableHead className="text-right">Difference</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.keys(summary).map(code => {
                                const exp = summary[code];
                                const act = Number(actuals[code] || 0);
                                const diff = act - exp;

                                return (
                                    <TableRow key={code}>
                                        <TableCell className="font-medium">{formatLabel(code)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(exp)}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="h-8 w-24 ml-auto text-right"
                                                value={actuals[code] || ""}
                                                onChange={(e) => handleActualChange(code, e.target.value)}
                                                placeholder={exp.toString()} // Hint expected
                                            />
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${diff < 0 ? "text-red-500" : diff > 0 ? "text-green-500" : ""}`}>
                                            {formatCurrency(diff)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {Object.keys(summary).length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">No sales recorded in this shift.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="destructive" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Close
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
