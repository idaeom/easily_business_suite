
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

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function WalletReconciliationClient({ initialDeposits, fundingAccounts }: { initialDeposits: Deposit[], fundingAccounts: BusinessAccount[] }) {
    const router = useRouter();
    const [deposits, setDeposits] = useState(initialDeposits);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});

    // Search & Pagination State
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 8; // Card view, so maybe fewer items per page

    // Reset pagination on search
    if (page > Math.ceil(deposits.length / itemsPerPage) && deposits.length > 0) {
        // This is a naive reset, improved below with filtered check
    }

    // Filter relevant accounts
    const walletAccounts = fundingAccounts.filter(a => a.usage && a.usage.includes("WALLET_FUNDING"));
    const eligibleAccounts = walletAccounts.length > 0 ? walletAccounts : fundingAccounts.filter(a => a.type === 'BANK');

    const filteredDeposits = deposits.filter(d => {
        const query = search.toLowerCase();
        return (
            (d.customerName && d.customerName.toLowerCase().includes(query)) ||
            (d.reference && d.reference.toLowerCase().includes(query)) ||
            (d.paymentMethod && d.paymentMethod.toLowerCase().includes(query)) ||
            (d.amount && d.amount.includes(query))
        );
    });

    const totalPages = Math.ceil(filteredDeposits.length / itemsPerPage);
    const paginatedDeposits = filteredDeposits.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Filter Logic Effect
    // Using simple effect to reset page when search changes
    // We cannot use useEffect here easily because we are inside the component body but I will add Filter logic effect properly
    // Wait, I can use a simple if logic or just slice.

    // Better to use derived state. 
    // And use an effect to reset page.

    // We must ensure 'page' is valid.
    /* Effect for page reset */
    // Note: I can't add useEffect conditionally if I edit blindly. But I can insert imports.

    async function handleConfirm(id: string) {
        // ... existing
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

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex justify-between items-center bg-white p-3 rounded-md border shadow-sm">
                <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search Customer, Ref, Amount..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="text-sm text-muted-foreground mr-2">
                    {filteredDeposits.length} Pending
                </div>
            </div>

            {filteredDeposits.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                    {deposits.length === 0 ? "No pending wallet deposits found." : "No deposits match your search."}
                </div>
            ) : (
                <div className="grid gap-4">
                    {paginatedDeposits.map((deposit) => (
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
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm font-medium">Page {page} of {totalPages}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
