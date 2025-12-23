"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Pencil } from "lucide-react";
import { createBusinessAccount, updateBusinessAccount, BusinessAccountInput } from "@/actions/finance";
import { BusinessAccount } from "@/db/schema";
import { Protect } from "@/components/auth/Protect";

interface AccountDialogProps {
    account?: BusinessAccount; // If present, Edit mode
    glAccounts: { id: string; name: string; code: string; type: string }[];
}

export function AccountDialog({ account, glAccounts }: AccountDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [type, setType] = useState<"CASH" | "BANK" | "MOMO">("CASH");
    const [glAccountId, setGlAccountId] = useState("");
    const [usage, setUsage] = useState<string[]>([]);
    const [isEnabled, setIsEnabled] = useState(true);
    const [openingBalance, setOpeningBalance] = useState("");

    // Reset/Init on Open
    useEffect(() => {
        if (open) {
            if (account) {
                setName(account.name);
                setType(account.type as any);
                setGlAccountId(account.glAccountId);
                setUsage(account.usage || []);
                setIsEnabled(account.isEnabled ?? true);
                setOpeningBalance(""); // Not editable on update
            } else {
                setName("");
                setType("CASH");
                setGlAccountId("");
                setUsage(["REVENUE_COLLECTION"]);
                setIsEnabled(true);
                setOpeningBalance("");
            }
        }
    }, [open, account]);

    const handleUsageToggle = (tag: string) => {
        setUsage(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        const payload: BusinessAccountInput = {
            name,
            type,
            glAccountId,
            usage,
            isEnabled,
            openingBalance: openingBalance ? Number(openingBalance) : 0
        };

        try {
            if (account) {
                await updateBusinessAccount(account.id, payload);
            } else {
                await createBusinessAccount(payload);
            }
            setOpen(false);
        } catch (error) {
            console.error(error);
            // toast error
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Protect permission="MANAGE_ACCOUNTS">
                    {account ? (
                        <Button variant="ghost" size="icon">
                            <Pencil className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Account
                        </Button>
                    )}
                </Protect>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{account ? "Edit Account" : "New Business Account"}</DialogTitle>
                        <DialogDescription>
                            Configure a business account and link it to your Chart of Accounts.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Main Cash Register"
                                required
                            />
                        </div>

                        {!account && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="openingBalance" className="text-right">
                                    Opening Balance
                                </Label>
                                <Input
                                    id="openingBalance"
                                    type="number"
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    className="col-span-3"
                                    placeholder="0.00"
                                    min="0"
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">
                                Type
                            </Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash Drawer / Safe</SelectItem>
                                    <SelectItem value="BANK">Bank Account</SelectItem>
                                    <SelectItem value="MOMO">Mobile Money</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="glAccount" className="text-right">
                                GL Linked
                            </Label>
                            <Select value={glAccountId} onValueChange={setGlAccountId} required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select GL Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {glAccounts.map((gl) => (
                                        <SelectItem key={gl.id} value={gl.id}>
                                            {gl.code} - {gl.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 gap-4 items-start">
                            <Label className="text-right mt-2">Usage</Label>
                            <div className="col-span-3 space-y-2 border p-3 rounded-md">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="use-rev"
                                        checked={usage.includes("REVENUE_COLLECTION")}
                                        onCheckedChange={() => handleUsageToggle("REVENUE_COLLECTION")}
                                    />
                                    <Label htmlFor="use-rev">Revenue Collection (POS)</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="use-wallet"
                                        checked={usage.includes("WALLET_FUNDING")}
                                        onCheckedChange={() => handleUsageToggle("WALLET_FUNDING")}
                                    />
                                    <Label htmlFor="use-wallet">Wallet Funding</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="use-exp"
                                        checked={usage.includes("EXPENSE_PAYOUT")}
                                        onCheckedChange={() => handleUsageToggle("EXPENSE_PAYOUT")}
                                    />
                                    <Label htmlFor="use-exp">Expense Payout</Label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Status</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Checkbox
                                    id="enabled"
                                    checked={isEnabled}
                                    onCheckedChange={(c) => setIsEnabled(!!c)}
                                />
                                <Label htmlFor="enabled">Active</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
