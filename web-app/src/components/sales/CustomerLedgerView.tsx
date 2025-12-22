
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getCustomerLedger, addCustomerBalance, getCustomerCreditScore } from "@/actions/customer-ledger";
import { formatDate } from "@/lib/utils";
import { Contact, Account } from "@/db/schema";
import { CreditScore } from "@/lib/credit-score";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, AlertCircle, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAccounts } from "@/actions/finance";

interface CustomerLedgerViewProps {
    customer: Contact;
}

export function CustomerLedgerView({ customer }: CustomerLedgerViewProps) {
    const [ledger, setLedger] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    // Duplicate line removed
    const [method, setMethod] = useState<"CASH" | "TRANSFER" | "CARD">("CASH");
    const [selectedAccountId, setSelectedAccountId] = useState("");
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    // Fetch Ledger & Score
    const fetchData = async () => {
        const [l, s, accs] = await Promise.all([
            getCustomerLedger(customer.id),
            getCustomerCreditScore(customer.id),
            getAccounts() // We should ideally filter for ASSET/CASH/BANK here or in UI
        ]);
        setLedger(l);
        setCreditScore(s);
        // Filter logical accounts for receiving money (Assets)
        setAccounts(accs.filter(a => ["ASSET"].includes(a.type) || a.code.startsWith("1"))); // Assuming 1xxx is Asset
    };

    useEffect(() => {
        fetchData();
    }, [customer.id]);

    const handleFundWallet = async () => {
        if (!amount) return;
        try {
            await addCustomerBalance(customer.id, parseFloat(amount), notes || "Manual Deposit", method);

            if (method === "TRANSFER") {
                toast({ title: "Request Submitted", description: "Deposit recorded. Use 'Wallet Deposits' to confirm." });
            } else {
                toast({ title: "Success", description: "Wallet funded successfully (Subject to Reconciliation)" });
            }

            setOpen(false);
            setAmount("");
            setNotes("");
            // Refresh
            window.location.reload();
        } catch (error) {
            toast({ title: "Error", description: "Failed to fund wallet", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${Number(customer.walletBalance) < 0 ? "text-red-500" : "text-green-500"}`}>
                            ₦{Number(customer.walletBalance).toLocaleString()}
                        </div>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="mt-2 w-full">Fund Wallet</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Fund Wallet</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payment Method</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={method}
                                            onChange={(e) => setMethod(e.target.value as any)}
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="CARD">Card / POS</option>
                                            <option value="TRANSFER">Bank Transfer</option>
                                        </select>
                                    </div>
                                    {/* Account Selection Removed - Reconciliation handled involved Revenue Pro */}
                                    <div className="space-y-2">
                                        <Label>Notes / Reference</Label>
                                        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Bank Ref, Depositor Name" />
                                    </div>
                                    <Button onClick={handleFundWallet} className="w-full">
                                        {method === "TRANSFER" ? "Record Transfer (Pending)" : "Confirm Deposit"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {creditScore?.score || "-"}
                            {creditScore && <Badge variant={creditScore.grade === "A" ? "default" : "destructive"}>{creditScore.grade}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Limit: ₦{(creditScore?.limit || 0).toLocaleString()}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(customer.loyaltyPoints).toFixed(0)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lifetime Sales</CardTitle>
                        <History className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{creditScore?.totalSales.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Ledger Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction Ledger</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead className="text-right">Debit (Sale)</TableHead>
                                <TableHead className="text-right">Credit (Pay)</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledger.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>{formatDate(entry.date)}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell>{entry.reference}</TableCell>
                                    <TableCell className="text-right text-red-600">
                                        {entry.debit > 0 ? `₦${entry.debit.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                        {entry.credit > 0 ? `₦${entry.credit.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        ₦{entry.balanceAfter?.toLocaleString() ?? 0}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
