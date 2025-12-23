"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { payExpensesBatch } from "@/actions/expenses"; // We just created this
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface PendingPayrollExpensesProps {
    expenses: any[];
    accounts: any[];
}

export function PendingPayrollExpenses({ expenses, accounts }: PendingPayrollExpensesProps) {
    const [open, setOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const bankAccounts = accounts.filter(a => ["BANK", "MOMO"].includes(a.type));

    const handlePayAll = async () => {
        if (!selectedAccount) return;
        setLoading(true);
        try {
            const expenseIds = expenses.map(e => e.id);
            const res = await payExpensesBatch(expenseIds, selectedAccount, "TRANSFER");

            if (res.success) {
                toast({
                    title: "Batch Payment Successful",
                    description: `Successfully initiated payment for ${expenses.length} expenses.`,
                    variant: "default",
                });
                setOpen(false);
            } else {
                toast({
                    title: "Payment Error",
                    description: res.message,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "System Error",
                description: "Failed to process batch payment.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (expenses.length === 0) return null;

    return (
        <>
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-blue-600" />
                            Pending Disbursements
                        </CardTitle>
                        <Button onClick={() => setOpen(true)} size="sm">
                            Pay All ({formatCurrency(totalAmount)})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">
                        You have {expenses.length} pending payroll liabilities (Salaries, Taxes, Pensions).
                    </div>
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.slice(0, 5).map(e => ( // Show top 5 only
                                    <TableRow key={e.id}>
                                        <TableCell className="font-medium">{e.description}</TableCell>
                                        <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                                        <TableCell>{formatCurrency(Number(e.amount))}</TableCell>
                                    </TableRow>
                                ))}
                                {expenses.length > 5 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                                            + {expenses.length - 5} more...
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Batch Payment</DialogTitle>
                        <DialogDescription>
                            You are about to pay <strong>{formatCurrency(totalAmount)}</strong> for {expenses.length} items.
                            This will debit the selected account and mark all liabilities as PAID.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Source Account</label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Bank Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.name} ({formatCurrency(Number(acc.balance))})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={handlePayAll} disabled={!selectedAccount || loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
