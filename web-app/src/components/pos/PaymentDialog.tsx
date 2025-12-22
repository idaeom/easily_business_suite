
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPosBusinessAccounts } from "@/actions/pos";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, Banknote, Smartphone } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const METHODS = [
    { code: "CASH", name: "Cash", icon: Banknote, accountTypes: ["CASH"] },
    { code: "CARD", name: "Card", icon: CreditCard, accountTypes: ["BANK", "MOMO"] },
    { code: "TRANSFER", name: "Transfer", icon: Smartphone, accountTypes: ["BANK"] },
];

interface PaymentDialogProps {
    open: boolean;
    onClose: () => void;
    total: number;
    items: any[];
    shiftId: string;
    contactId?: string;
    onSuccess: () => void;
    transactionExtras?: {
        discountId?: string;
        discountAmount?: number;
        taxAmount?: number;
        taxSnapshot?: any[];
        loyaltyPointsEarned?: number;
        loyaltyPointsRedeemed?: number;
    };
}

export default function PaymentDialog({ open, onClose, total, items, shiftId, contactId, onSuccess, transactionExtras }: PaymentDialogProps) {
    const { toast } = useToast();
    const [payments, setPayments] = useState<{ method: string, amount: number, accountId?: string }[]>([]);
    const [currentAmount, setCurrentAmount] = useState("");
    const [selectedMethod, setSelectedMethod] = useState("CASH");
    const [selectedAccount, setSelectedAccount] = useState("");
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            getPosBusinessAccounts().then(setAccounts);
        }
    }, [open]);

    const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = total - paidTotal;

    const addPayment = () => {
        const amt = Number(currentAmount);
        if (amt <= 0) return;

        // Overpayment Protection
        if (amt > (balance + 0.01)) { // Small float buffer
            toast({ title: "Error", description: "Amount exceeds remaining balance", variant: "destructive" });
            return;
        }

        const currentMethod = METHODS.find(m => m.code === selectedMethod);
        const filteredAccounts = accounts.filter(acc => currentMethod?.accountTypes.includes(acc.type));

        if (filteredAccounts.length > 0 && !selectedAccount) {
            toast({ title: "Error", description: `Please select a ${selectedMethod === 'CASH' ? 'Register' : 'Bank/Terminal'}`, variant: "destructive" });
            return;
        }

        setPayments([...payments, {
            method: selectedMethod,
            amount: amt,
            accountId: selectedAccount || undefined
        }]);
        setCurrentAmount("");
        setSelectedAccount("");
    };

    const handleProcess = async () => {
        setIsProcessing(true);
        try {
            await React.startTransition(async () => {
                // Import dynamically or use the action passed in if imports issue? (Using direct import)
                // Re-importing inside file usually fine.
                const { processTransaction } = await import("@/actions/pos");
                await processTransaction({
                    shiftId,
                    items: items.map(line => ({
                        itemId: line.item.id,
                        quantity: line.qty,
                        price: Number(line.item.price),
                        name: line.item.name
                    })),
                    payments: payments.map(p => ({
                        methodCode: p.method,
                        amount: p.amount,
                        accountId: p.accountId
                    })),
                    contactId: contactId,
                    finalTotal: total,
                    ...transactionExtras
                });
            });

            toast({ title: "Success", description: "Transaction Completed" });
            setPayments([]);
            onSuccess();
            onClose();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Complete Payment</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="text-center p-4 bg-slate-100 rounded-lg">
                        <div className="text-sm text-muted-foreground">Total Due</div>
                        <div className="text-3xl font-bold">{formatCurrency(total)}</div>
                        <div className={`text-sm font-medium mt-1 ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {balance > 0 ? `Balance: ${formatCurrency(balance)}` : "Fully Paid"}
                        </div>
                    </div>

                    {/* PAYMENT METHODS */}
                    <div className="grid grid-cols-3 gap-2">
                        {METHODS.map(m => (
                            <Button
                                key={m.code}
                                variant={selectedMethod === m.code ? "default" : "outline"}
                                className="flex flex-col gap-1 h-20"
                                onClick={() => setSelectedMethod(m.code)}
                            >
                                <m.icon className="h-5 w-5" />
                                <span className="text-xs">{m.name}</span>
                            </Button>
                        ))}
                    </div>

                    {/* Account Selection (Dynamic based on Method) */}
                    {(() => {
                        const currentMethod = METHODS.find(m => m.code === selectedMethod);
                        const filteredAccounts = accounts.filter(acc => currentMethod?.accountTypes.includes(acc.type));

                        // If accounts exist for this method, show selector (Required)
                        if (filteredAccounts.length > 0) {
                            return (
                                <div className="space-y-1">
                                    <Label>Select {selectedMethod === 'CASH' ? 'Register / Drawer' : 'Terminal / Bank'}</Label>
                                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredAccounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.glAccountId}>{acc.name} ({acc.type})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Enter Amount"
                            value={currentAmount}
                            onChange={(e) => setCurrentAmount(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') addPayment();
                            }}
                        />
                        <Button onClick={addPayment} disabled={!currentAmount}>Add Payment</Button>
                    </div>

                    {/* PAYMENTS LIST */}
                    <div className="space-y-2 border-t pt-2">
                        {payments.length === 0 && <p className="text-xs text-muted-foreground text-center">No payments added yet.</p>}
                        {payments.map((p, i) => (
                            <div key={i} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                                <div>
                                    <span className="font-medium">{p.method}</span>
                                    {p.accountId && <span className="text-xs text-muted-foreground ml-2">(Terminal Selected)</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>{formatCurrency(p.amount)}</span>
                                    <button className="text-red-500 text-xs hover:underline" onClick={() => setPayments(payments.filter((_, idx) => idx !== i))}>Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button
                        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                        disabled={balance > 0.01 || isProcessing || payments.length === 0}
                        onClick={handleProcess}
                    >
                        {isProcessing ? "Processing..." : "Complete Sale"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
