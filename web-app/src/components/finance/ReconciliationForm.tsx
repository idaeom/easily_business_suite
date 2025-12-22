"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Loader2, CheckCircle2, Calculator } from "lucide-react";
import { useState } from "react";
import { reconcileShift } from "@/actions/pos"; // We need to export this or similar action
import { useRouter } from "next/navigation";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BusinessAccount } from "@/db/schema";

interface ShiftDetail {
    id: string;
    outletName: string;
    cashierName: string;
    openedAt: Date;
    closedAt: Date | null;
    expectedCash: number;
    expectedCard: number;
    expectedTransfer: number;
    declaredCash: number;
    declaredCard: number;
    declaredTransfer: number;
}

interface ReconciliationFormProps {
    shift: ShiftDetail;
    pendingWalletTotal: number;
    pendingWalletCount: number;
    walletDepositsCash: number;
    walletDepositsCard: number;
    accountsList: BusinessAccount[];
}

export function ReconciliationForm({ shift, pendingWalletTotal, pendingWalletCount, walletDepositsCash, walletDepositsCard, accountsList }: ReconciliationFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Initial state from declared values
    const [verifiedCash, setVerifiedCash] = useState(shift.declaredCash.toString());
    const [verifiedCard, setVerifiedCard] = useState(shift.declaredCard.toString());
    const [verifiedTransfer, setVerifiedTransfer] = useState(shift.declaredTransfer.toString());

    // Selected Accounts State
    const [selectedCashAccount, setSelectedCashAccount] = useState<string>("");
    const [selectedCardAccount, setSelectedCardAccount] = useState<string>("");
    const [selectedTransferAccount, setSelectedTransferAccount] = useState<string>("");

    // Filter Accounts
    const cashAccounts = accountsList.filter(a => a.type === "CASH" && a.isEnabled);
    const bankAccounts = accountsList.filter(a => a.type === "BANK" && a.isEnabled);

    // Calculations
    const cashVariance = Number(verifiedCash) - shift.expectedCash;
    const cardVariance = Number(verifiedCard) - shift.expectedCard;
    const transferVariance = Number(verifiedTransfer) - shift.expectedTransfer;
    const totalVariance = cashVariance + cardVariance + transferVariance;

    async function handleReconcile() {
        if (!selectedCashAccount || !selectedCardAccount || !selectedTransferAccount) {
            // Optional: Allow proceeding if amount is 0?
            // Simple check: if amount > 0, require account
            const needsCash = Number(verifiedCash) > 0 && !selectedCashAccount;
            const needsCard = Number(verifiedCard) > 0 && !selectedCardAccount;
            const needsTransfer = Number(verifiedTransfer) > 0 && !selectedTransferAccount;

            if (needsCash || needsCard || needsTransfer) {
                // Toast error or validation
                alert("Please select a target account for all verified amounts.");
                return;
            }
        }

        setIsLoading(true);
        try {
            await reconcileShift(shift.id, {
                verifiedCash: Number(verifiedCash),
                verifiedCard: Number(verifiedCard),
                verifiedTransfer: Number(verifiedTransfer),
                cashAccountId: selectedCashAccount,
                cardAccountId: selectedCardAccount,
                transferAccountId: selectedTransferAccount
            });
            router.push("/dashboard/business/revenue");
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>System Totals</CardTitle>
                    <CardDescription>Expected revenue based on recorded sales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Expected Cash */}
                    <div className="bg-slate-50 p-3 rounded-lg dark:bg-slate-900/50 space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Expected Cash</Label>
                            <span className="font-mono text-lg">{formatCurrency(shift.expectedCash)}</span>
                        </div>
                        {walletDepositsCash > 0 && (
                            <div className="text-xs text-slate-500 pl-2 border-l-2 border-slate-300">
                                <div className="flex justify-between">
                                    <span>Sales (Cash)</span>
                                    <span>{formatCurrency(shift.expectedCash - walletDepositsCash)}</span>
                                </div>
                                <div className="flex justify-between text-blue-600 font-medium">
                                    <span>Wallet Deposits</span>
                                    <span>{formatCurrency(walletDepositsCash)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Expected Card */}
                    <div className="bg-slate-50 p-3 rounded-lg dark:bg-slate-900/50 space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Expected Card</Label>
                            <span className="font-mono text-lg">{formatCurrency(shift.expectedCard)}</span>
                        </div>
                        {walletDepositsCard > 0 && (
                            <div className="text-xs text-slate-500 pl-2 border-l-2 border-slate-300">
                                <div className="flex justify-between">
                                    <span>Sales (Card)</span>
                                    <span>{formatCurrency(shift.expectedCard - walletDepositsCard)}</span>
                                </div>
                                <div className="flex justify-between text-blue-600 font-medium">
                                    <span>Wallet Deposits</span>
                                    <span>{formatCurrency(walletDepositsCard)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Expected Transfer */}
                    <div className="bg-slate-50 p-3 rounded-lg dark:bg-slate-900/50 space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Expected Transfer</Label>
                            <span className="font-mono text-lg">{formatCurrency(shift.expectedTransfer)}</span>
                        </div>
                    </div>

                    {pendingWalletCount > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                            <div className="flex justify-between items-center text-blue-700 dark:text-blue-300">
                                <Label className="cursor-pointer">Wallet Deposits (Pending)</Label>
                                <span className="font-mono font-bold">{formatCurrency(pendingWalletTotal)}</span>
                            </div>
                            <p className="text-xs text-blue-600/80 mt-1">
                                {pendingWalletCount} deposits will be confirmed upon reconciliation.
                            </p>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center p-3">
                        <Label className="font-bold">Total Expected</Label>
                        <span className="font-bold text-xl">{formatCurrency(shift.expectedCash + shift.expectedCard + shift.expectedTransfer)}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-blue-600 dark:text-blue-400">Reconciliation</CardTitle>
                    <CardDescription>Verify actual amounts to post to General Ledger</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Verified Cash */}
                    <div className="space-y-2">
                        <Label htmlFor="verifiedCash">Verified Cash on Hand</Label>
                        <div className="flex gap-4 items-center">
                            <Input
                                id="verifiedCash"
                                type="number"
                                value={verifiedCash}
                                onChange={(e) => setVerifiedCash(e.target.value)}
                                className="font-mono text-lg text-right"
                            />
                            <Select value={selectedCashAccount} onValueChange={setSelectedCashAccount}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="To Account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cashAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className={`text-sm font-medium ${cashVariance < 0 ? 'text-red-500' : 'text-slate-500'} text-right`}>
                            Var: {formatCurrency(cashVariance)}
                        </div>
                    </div>

                    {/* Verified Card */}
                    <div className="space-y-2">
                        <Label htmlFor="verifiedCard">Verified Card Totals</Label>
                        <div className="flex gap-4 items-center">
                            <Input
                                id="verifiedCard"
                                type="number"
                                value={verifiedCard}
                                onChange={(e) => setVerifiedCard(e.target.value)}
                                className="font-mono text-lg text-right"
                            />
                            <Select value={selectedCardAccount} onValueChange={setSelectedCardAccount}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="To Account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className={`text-sm font-medium ${cardVariance < 0 ? 'text-red-500' : 'text-slate-500'} text-right`}>
                            Var: {formatCurrency(cardVariance)}
                        </div>
                    </div>

                    {/* Verified Transfer */}
                    <div className="space-y-2">
                        <Label htmlFor="verifiedTransfer">Verified Transfer Totals</Label>
                        <div className="flex gap-4 items-center">
                            <Input
                                id="verifiedTransfer"
                                type="number"
                                value={verifiedTransfer}
                                onChange={(e) => setVerifiedTransfer(e.target.value)}
                                className="font-mono text-lg text-right"
                            />
                            <Select value={selectedTransferAccount} onValueChange={setSelectedTransferAccount}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="To Account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className={`text-sm font-medium ${transferVariance < 0 ? 'text-red-500' : 'text-slate-500'} text-right`}>
                            Var: {formatCurrency(transferVariance)}
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg flex justify-between items-center ${totalVariance === 0 ? 'bg-green-100 dark:bg-green-900/20 text-green-700' : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700'}`}>
                        <div className="flex items-center gap-2">
                            <Calculator className="w-5 h-5" />
                            <span className="font-medium">Total Variance</span>
                        </div>
                        <span className="font-bold text-lg">
                            {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                        </span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                        onClick={handleReconcile}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Approve & Post to Ledger
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
