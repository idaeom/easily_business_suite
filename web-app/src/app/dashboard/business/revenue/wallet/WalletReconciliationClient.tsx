
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle2, Loader2, Building2 } from "lucide-react";
import { useState } from "react";
import { confirmWalletDeposit } from "@/actions/customer-ledger";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BusinessAccount } from "@/db/schema";

interface Deposit {
    id: string;
    date: Date;
    amount: string;
    description: string | null;
    customerName: string | null;
    paymentMethod: string | null;
    reference: string | null;
    bankAccount: string | null;
}

export function WalletReconciliationClient({ initialDeposits, fundingAccounts }: { initialDeposits: Deposit[], fundingAccounts: BusinessAccount[] }) {
    const router = useRouter();
    const [deposits, setDeposits] = useState(initialDeposits);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});

    // Filter relevant accounts
    const walletAccounts = fundingAccounts.filter(a => a.usage && a.usage.includes("WALLET_FUNDING"));
    // If no specific tag, maybe show all BANK type? Fallback logic.
    const eligibleAccounts = walletAccounts.length > 0 ? walletAccounts : fundingAccounts.filter(a => a.type === 'BANK');

    async function handleConfirm(id: string) {
        const accountId = selectedAccounts[id];
        if (!accountId) {
            toast.error("Please select a target account for this deposit.");
            return;
        }

        setProcessingId(id);
        try {
            await confirmWalletDeposit(id, accountId);
            toast.success("Deposit confirmed and wallet funded.");
            setDeposits((prev) => prev.filter((d) => d.id !== id));
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to confirm deposit.");
        } finally {
            setProcessingId(null);
        }
    }

    if (deposits.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                No pending wallet deposits found.
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {deposits.map((deposit) => (
                <Card key={deposit.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{deposit.customerName || "Unknown Customer"}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                                {deposit.paymentMethod || "CASH"}
                            </span>
                        </div>
                        <div className="text-sm text-muted-foreground flex gap-4">
                            <span>{formatDate(deposit.date)}</span>
                            <span>Ref: {deposit.reference || "-"}</span>
                        </div>
                        <div className="text-sm text-slate-500">
                            {deposit.description}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-end md:items-center gap-4 w-full md:w-auto">

                        {/* Target Account Selector */}
                        <div className="w-[200px]">
                            <Select
                                value={selectedAccounts[deposit.id] || ""}
                                onValueChange={(val) => setSelectedAccounts(prev => ({ ...prev, [deposit.id]: val }))}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Deposit To..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {eligibleAccounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-3 h-3 opacity-50" />
                                                <span>{acc.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-right min-w-[100px]">
                            <div className="font-bold text-xl">{formatCurrency(Number(deposit.amount))}</div>
                            <div className="text-xs text-muted-foreground">Pending Credit</div>
                        </div>

                        <Button
                            onClick={() => handleConfirm(deposit.id)}
                            disabled={processingId === deposit.id || !selectedAccounts[deposit.id]}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {processingId === deposit.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Confirm
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    );
}
