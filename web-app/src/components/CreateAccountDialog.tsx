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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAccount, getBanks } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

export function CreateAccountDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [bankList, setBankList] = useState<{ name: string; code: string }[]>([]);
    const [accountCategory, setAccountCategory] = useState("STANDARD"); // STANDARD, BANK, VIRTUAL
    const { toast } = useToast();

    useEffect(() => {
        if (open && accountCategory === "BANK") {
            // Fetch banks when dialog opens and mode is BANK (or pre-fetch)
            const fetchBanks = async () => {
                try {
                    const banks = await getBanks("PAYSTACK"); // Default to Paystack list for manual banks
                    setBankList(banks);
                } catch (error) {
                    console.error("Failed to fetch banks", error);
                }
            };
            fetchBanks();
        }
    }, [open, accountCategory]);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);

        // Append category info if needed, but the form structure handles it via "provider" field logic below
        // actually we need to set the "provider" field value based on category
        // The form fields inside the tabs will be present in formData if they are rendered? 
        // No, TabsContent unmounts hidden content? usually yes.
        // Wait, Radix Tabs (shadcn) unmounts content. So only active tab fields are submitted.

        // We need to ensure the correct "provider" value is sent.
        // If STANDARD: provider = "" (or don't include)
        // If BANK: provider = "BANK"
        // If VIRTUAL: provider = "PAYSTACK" | "SQUADCO"

        // We can add a hidden input for "provider" or rely on the visible Selects.
        // For Virtual, we have a Select name="provider".
        // For Bank, we need to enforce provider="BANK".
        // For Standard, provider should be empty.

        // I'll manually append logic to formData or handle it in specific inputs.
        if (accountCategory === "BANK") {
            formData.set("provider", "BANK");
        } else if (accountCategory === "STANDARD") {
            formData.delete("provider");
        }
        // For VIRTUAL, "provider" input exists in the tab.

        try {
            await createAccount(formData);
            toast({ title: "Success", description: "Account created successfully" });
            setOpen(false);
            // event.target is the form, reset it
            (event.target as HTMLFormElement).reset();
            setAccountCategory("STANDARD");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create account",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Account
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Account</DialogTitle>
                    <DialogDescription>
                        Create a new financial account.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Common Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Account Name</Label>
                                <Input id="name" name="name" placeholder="e.g. Sales Revenue" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="code">Account Code</Label>
                                <Input id="code" name="code" placeholder="e.g. 4001" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type">Type</Label>
                                <Select name="type" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ASSET">Asset</SelectItem>
                                        <SelectItem value="LIABILITY">Liability</SelectItem>
                                        <SelectItem value="EQUITY">Equity</SelectItem>
                                        <SelectItem value="INCOME">Income</SelectItem>
                                        <SelectItem value="EXPENSE">Expense</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select name="currency" defaultValue="NGN">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NGN">NGN</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Category Tabs */}
                        <Tabs defaultValue="STANDARD" value={accountCategory} onValueChange={setAccountCategory} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="STANDARD">Standard GL</TabsTrigger>
                                <TabsTrigger value="BANK">Manual Bank</TabsTrigger>
                                <TabsTrigger value="VIRTUAL">Virtual NUBAN</TabsTrigger>
                            </TabsList>

                            <TabsContent value="STANDARD" className="pt-4">
                                <div className="p-4 border rounded-md bg-muted/20 text-sm text-muted-foreground text-center">
                                    Standard General Ledger account. No external banking features.
                                    <br />Used for Cash, Inventory, Retained Earnings, etc.
                                </div>
                            </TabsContent>

                            <TabsContent value="BANK" className="space-y-4 pt-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="bankName">Bank Name</Label>
                                    <Select name="bankName">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankList.length > 0 ? bankList.map((bank) => (
                                                <SelectItem key={bank.code} value={bank.name}>
                                                    {bank.name}
                                                </SelectItem>
                                            )) : (
                                                <SelectItem value="loading" disabled>Loading banks...</SelectItem>
                                            )}
                                            {/* Allow manual entry fallback visually or logic? For now standard list */}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="accountNumber">Account Number</Label>
                                    <Input id="accountNumber" name="accountNumber" placeholder="0123456789" />
                                </div>
                            </TabsContent>

                            <TabsContent value="VIRTUAL" className="space-y-4 pt-4">
                                <div className="p-3 border border-blue-200 bg-blue-50 text-blue-800 rounded-md text-sm mb-2">
                                    A dedicated virtual NUBAN will be generated using the Provider.
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="provider">Provider</Label>
                                    <Select name="provider" defaultValue="PAYSTACK">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PAYSTACK">Paystack</SelectItem>
                                            <SelectItem value="SQUADCO">Squadco</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone Number (Required for NUBAN)</Label>
                                    <Input id="phone" name="phone" placeholder="08012345678" type="tel" />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea id="description" name="description" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
