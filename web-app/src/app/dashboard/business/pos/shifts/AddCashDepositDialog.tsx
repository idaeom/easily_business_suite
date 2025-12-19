
"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import { addShiftCashDeposit, getBankAccounts } from "@/actions/pos";

export function AddCashDepositDialog({ shiftId, onDepositComplete }: { shiftId: string, onDepositComplete?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [accounts, setAccounts] = useState<{ id: string, name: string }[]>([]);

    // Form Stats
    const [amount, setAmount] = useState("");
    const [accountId, setAccountId] = useState("");
    const [reference, setReference] = useState("");

    // Fetch Accounts on Open
    useEffect(() => {
        if (open) {
            getBankAccounts().then(setAccounts).catch(console.error);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            toast({ title: "Invalid Amount", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await addShiftCashDeposit({
                shiftId,
                amount: Number(amount),
                accountId: accountId || undefined,
                reference
            });
            toast({ title: "Deposit Recorded" });
            setOpen(false);
            setAmount("");
            setAccountId("");
            setReference("");
            onDepositComplete?.();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Record Deposit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Cash Deposit</DialogTitle>
                    <DialogDescription>
                        Log cash removed from drawer to bank or safe.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="account">Destination Account (Optional)</Label>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Account (e.g. Bank/Safe)" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="ref">Reference / Slip No</Label>
                        <Input
                            id="ref"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="e.g. SLIP-1234"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Deposit
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
