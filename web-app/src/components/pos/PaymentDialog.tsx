
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPosBusinessAccounts } from "@/actions/pos";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Star, Banknote, CreditCard, Smartphone } from "lucide-react"; // Add Star icon
import { getCustomer } from "@/actions/customers"; // Add getCustomer
import { calculateRedemptionValue } from "@/actions/loyalty"; // Helper to show monetary value

const METHODS = [
    { code: "CASH", name: "Cash", icon: Banknote, accountTypes: ["CASH"] },
    { code: "CARD", name: "Card", icon: CreditCard, accountTypes: ["BANK", "MOMO"] },
    { code: "TRANSFER", name: "Transfer", icon: Smartphone, accountTypes: ["BANK"] },
    { code: "LOYALTY", name: "Points", icon: Star, accountTypes: [] }, // New Method
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
    outletId: string; // Need OutletId for redemption rate
}

export default function PaymentDialog({ open, onClose, total, items, shiftId, contactId, onSuccess, transactionExtras, outletId }: PaymentDialogProps) {
    const { toast } = useToast();
    const [payments, setPayments] = useState<{ method: string, amount: number, accountId?: string }[]>([]);
    const [currentAmount, setCurrentAmount] = useState("");
    const [selectedMethod, setSelectedMethod] = useState("CASH");
    const [selectedAccount, setSelectedAccount] = useState("");
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Loyalty State
    const [loyaltyBalance, setLoyaltyBalance] = useState(0);
    const [loyaltyValue, setLoyaltyValue] = useState(0);

    useEffect(() => {
        if (open) {
            getPosBusinessAccounts().then(setAccounts);
            if (contactId) {
                getCustomer(contactId).then(c => {
                    if (c) {
                        const pts = Number(c.loyaltyPoints || 0);
                        setLoyaltyBalance(pts);
                        calculateRedemptionValue(outletId, pts).then(setLoyaltyValue);
                    }
                });
            }
        }
    }, [open, contactId, outletId]);

    const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = total - paidTotal;

    const addPayment = () => {
        const amt = Number(currentAmount);
        if (amt <= 0) return;

        // Overpayment Protection
        if (amt > (balance + 0.01)) {
            toast({ title: "Error", description: "Amount exceeds remaining balance", variant: "destructive" });
            return;
        }

        // Loyalty Validation
        if (selectedMethod === "LOYALTY") {
            if (amt > loyaltyValue) {
                toast({ title: "Error", description: `Insufficient Points Value (Max: ${formatCurrency(loyaltyValue)})`, variant: "destructive" });
                return;
            }
        }

        const currentMethod = METHODS.find(m => m.code === selectedMethod);
        if (!currentMethod) return;

        const filteredAccounts = accounts.filter(acc => currentMethod.accountTypes.includes(acc.type));

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
                const { processTransaction } = await import("@/actions/pos");

                // Calculate Points Redeemed from Monetary Amount
                // We need to reverse calculate: Points = Amount / Rate.
                // But safer to let server handle conversion? Or pass specific field?
                // pos.ts supports `loyaltyPointsRedeemed`.
                // Let's deduce points from the "LOYALTY" payment line.

                const loyaltyPayment = payments.find(p => p.method === "LOYALTY");
                let pointsRedeemed = 0;
                if (loyaltyPayment) {
                    // Get rate again (or store it). 
                    // Simple check: Value = Points * Rate => Points = Value / Rate.
                    // Rate = Value / Balance (if balance > 0). 
                    // Or better: call a helper? 
                    // For UI simplicity, passing the monetary amount as payment is key.
                    // The Server `processTransaction` logic needs to know "Points Redeemed" to deduct from balance.
                    // AND "Amount Paid" to reduce debt.
                    // We passed `loyaltyPointsRedeemed` in `processTransaction`.
                    // We will calculate it here roughly:
                    if (loyaltyValue > 0 && loyaltyBalance > 0) {
                        const rate = loyaltyValue / loyaltyBalance;
                        pointsRedeemed = loyaltyPayment.amount / rate;
                    }
                }

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
                    loyaltyPointsRedeemed: pointsRedeemed,
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
                    <div className="grid grid-cols-4 gap-2"> {/* Increased cols */}
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

                    {/* LOYALTY INFO */}
                    {selectedMethod === "LOYALTY" && contactId && (
                        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                            <div className="font-semibold flex items-center gap-2">
                                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                Loyalty Balance
                            </div>
                            <div className="flex justify-between mt-1">
                                <span>Available Points: {loyaltyBalance}</span>
                                <span>Value: {formatCurrency(loyaltyValue)}</span>
                            </div>
                        </div>
                    )}
                    {selectedMethod === "LOYALTY" && !contactId && (
                        <div className="p-2 bg-red-50 text-red-600 text-sm rounded">
                            Customer must be attached to redeem points.
                        </div>
                    )}

                    {/* Account Selection */}
                    {(() => {
                        const currentMethod = METHODS.find(m => m.code === selectedMethod);
                        if (!currentMethod) return null;
                        const filteredAccounts = accounts.filter(acc => currentMethod.accountTypes.includes(acc.type));

                        if (filteredAccounts.length > 0) {
                            return (
                                <div className="space-y-1">
                                    <Label>Select {selectedMethod === 'CASH' ? 'Register' : 'Terminal / Bank'}</Label>
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
                    <div className="space-y-2 border-t pt-2 max-h-40 overflow-y-auto">
                        {payments.length === 0 && <p className="text-xs text-muted-foreground text-center">No payments added yet.</p>}
                        {payments.map((p, i) => (
                            <div key={i} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                                <div>
                                    <span className="font-medium">{METHODS.find(m => m.code === p.method)?.name || p.method}</span>
                                    {p.accountId && <span className="text-xs text-muted-foreground ml-2">(Acc Selected)</span>}
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
