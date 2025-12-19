"use client";

import { updateExpenseStatus, disburseExpense } from "@/app/actions";
import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { ConfirmExpenseActionDialog } from "@/components/ConfirmExpenseActionDialog";
import { Button } from "@/components/ui/button";

export function ExpenseActions({ expense, accounts }: { expense: any, accounts?: any[] }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [action, setAction] = useState<"CERTIFY" | "APPROVE" | "DISBURSE" | "REJECT" | null>(null);

    const handleAction = async (method?: "ONLINE" | "MANUAL", sourceAccountId?: string, otp?: string) => {
        if (!action) return;
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            if (action === "DISBURSE") {
                await disburseExpense(expense.id, method, sourceAccountId, otp);
            } else {
                const statusMap: Record<string, "APPROVED" | "REJECTED" | "CERTIFIED"> = {
                    "CERTIFY": "CERTIFIED",
                    "APPROVE": "APPROVED",
                    "REJECT": "REJECTED"
                };
                // @ts-ignore
                await updateExpenseStatus(expense.id, statusMap[action]);
            }
            setAction(null);
        } catch (error: any) {
            console.error("Action failed:", error);
            // Extract error message safely
            const message = error?.message || "An unexpected error occurred.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {expense.status === "PENDING" && (
                <>
                    <Button size="sm" onClick={() => { setAction("CERTIFY"); setError(null); }} disabled={loading}>Certify</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setAction("REJECT"); setError(null); }} disabled={loading}>Reject</Button>
                </>
            )}
            {expense.status === "CERTIFIED" && (
                <>
                    <Button size="sm" onClick={() => { setAction("APPROVE"); setError(null); }} disabled={loading}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setAction("REJECT"); setError(null); }} disabled={loading}>Reject</Button>
                </>
            )}
            {(expense.status === "APPROVED" || expense.status === "PARTIALLY_PAID" || expense.status === "PAYMENT_FAILED") && (
                <Button
                    size="sm"
                    onClick={() => { setAction("DISBURSE"); setError(null); }}
                    disabled={loading}
                    variant={expense.status === "APPROVED" ? "default" : "destructive"} // Red for retry
                >
                    {expense.status === "APPROVED" ? "Disburse" : "Retry Payment"}
                </Button>
            )}

            {action && (
                <ConfirmExpenseActionDialog
                    open={!!action}
                    onOpenChange={(open) => !open && setAction(null)}
                    onConfirm={handleAction}
                    action={action}
                    expense={expense}
                    accounts={accounts}
                    error={error} // Pass error state
                />
            )}

            <Button size="sm" variant="outline" asChild>
                <a href={`/api/expenses/${expense.id}/download`} download>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                </a>
            </Button>
        </div>
    );
}
