
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approvePayrollRun } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

export default function ApprovePayrollButton({ runId }: { runId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleApprove() {
        if (!confirm("Are you sure you want to approve this payroll run? This will generate an Expense Request for disbursement.")) {
            return;
        }

        setLoading(true);
        try {
            await approvePayrollRun(runId);
            toast({
                title: "Success",
                description: "Payroll approved and Expense Request generated.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to approve payroll.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
            {loading ? "Processing..." : "Approve & Create Expense"}
        </Button>
    );
}
