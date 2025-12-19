"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Label } from "@/components/ui/label";

interface ConfirmExpenseActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (method?: "ONLINE" | "MANUAL", sourceAccountId?: string, otp?: string) => void;
    action: "CERTIFY" | "APPROVE" | "DISBURSE" | "REJECT";
    expense: any;
    accounts?: any[];
    error?: string | null;
}

export function ConfirmExpenseActionDialog({ open, onOpenChange, onConfirm, action, expense, accounts, error }: ConfirmExpenseActionDialogProps) {
    const totalAmount = Number(expense.amount);
    const beneficiaryCount = expense.beneficiaries?.length || 0;
    const [method, setMethod] = useState<"ONLINE" | "MANUAL">("ONLINE");
    const [sourceAccountId, setSourceAccountId] = useState<string>("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);

    const handleConfirm = () => {
        if (action === "DISBURSE") {
            onConfirm(method, sourceAccountId, otp);
        } else {
            onConfirm();
        }
    };

    const requestOtp = async () => {
        const { generateOtp } = await import("@/app/actions");
        await generateOtp();
        setOtpSent(true);
        alert("OTP Sent to console (dev mode)");
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm {action === "DISBURSE" ? "Disbursement" : action === "CERTIFY" ? "Certification" : action === "APPROVE" ? "Approval" : "Rejection"}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to {action.toLowerCase()} this expense request?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
                        <strong className="font-bold block mb-1">Action Failed</strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="py-4 space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                        <span className="text-sm font-medium">Total Amount</span>
                        <span className="text-lg font-bold">NGN {totalAmount.toLocaleString()}</span>
                    </div>

                    <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Details</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Category:</div>
                            <div className="font-medium">{expense.category || "N/A"}</div>
                            <div>Beneficiaries:</div>
                            <div className="font-medium">{beneficiaryCount}</div>
                        </div>
                    </div>

                    {action === "DISBURSE" && (
                        <>
                            <Tabs defaultValue="ONLINE" onValueChange={(v) => setMethod(v as any)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="ONLINE">Online Payment</TabsTrigger>
                                    <TabsTrigger value="MANUAL">Manual Payment</TabsTrigger>
                                </TabsList>
                                <TabsContent value="ONLINE" className="space-y-4 pt-2">
                                    <p className="text-sm text-muted-foreground">
                                        Disburse funds directly to beneficiaries via a connected provider.
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="online-account">Source Wallet</Label>
                                        <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                                            <SelectTrigger id="online-account">
                                                <SelectValue placeholder="Select wallet" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts?.filter(acc => acc.provider && acc.provider !== "BANK").map((acc) => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.name} ({acc.provider}) - {acc.currency} {Number(acc.balance).toLocaleString()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>
                                <TabsContent value="MANUAL" className="space-y-4 pt-2">
                                    <p className="text-sm text-muted-foreground">
                                        Record a manual payment made outside the system.
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="manual-account">Source Account</Label>
                                        <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                                            <SelectTrigger id="manual-account">
                                                <SelectValue placeholder="Select account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {accounts?.map((acc) => (
                                                    <SelectItem key={acc.id} value={acc.id}>
                                                        {acc.name} ({acc.currency})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="space-y-2 pt-4 border-t">
                                <Label>Security Verification</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        maxLength={6}
                                    />
                                    <button
                                        onClick={requestOtp}
                                        disabled={otpSent}
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
                                    >
                                        {otpSent ? "Sent" : "Get OTP"}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    An OTP will be sent to your registered email/console.
                                </p>
                            </div>
                        </>
                    )}

                    {expense.beneficiaries && expense.beneficiaries.length > 0 && (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto border rounded-md p-2">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Beneficiary Breakdown</div>
                            {expense.beneficiaries.map((b: any) => (
                                <div key={b.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                                    <span>{b.name} ({b.bankName})</span>
                                    <span className="font-mono">NGN {Number(b.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className={action === "REJECT" ? "bg-red-600 hover:bg-red-700" : ""}
                        disabled={
                            (action === "DISBURSE" && !sourceAccountId) ||
                            (action === "DISBURSE" && otp.length !== 6)
                        }
                    >
                        Confirm {action.charAt(0) + action.slice(1).toLowerCase()}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
