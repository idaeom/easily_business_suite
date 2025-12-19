"use client";

import { Button } from "@/components/ui/button";
import { updateTaskStatus } from "@/app/actions";
import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

import { ConfirmApprovalDialog } from "@/components/ConfirmApprovalDialog";

export function TaskActions({ taskId, status }: { taskId: string; status: "TODO" | "IN_PROGRESS" | "DONE" | "CERTIFIED" | "APPROVED" }) {
    const [loading, setLoading] = useState(false);
    const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);

    const handleStatusChange = async (newStatus: "TODO" | "IN_PROGRESS" | "DONE" | "CERTIFIED" | "APPROVED") => {
        if (newStatus === "APPROVED") {
            setApprovalDialogOpen(true);
            return;
        }
        await executeStatusChange(newStatus);
    };

    const executeStatusChange = async (newStatus: "TODO" | "IN_PROGRESS" | "DONE" | "CERTIFIED" | "APPROVED") => {
        setLoading(true);
        try {
            await updateTaskStatus(taskId, newStatus);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Button disabled size="sm"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</Button>;
    }

    return (
        <>
            <div className="flex gap-2">
                {status === "TODO" && (
                    <Button size="sm" onClick={() => handleStatusChange("IN_PROGRESS")}>Start Progress</Button>
                )}
                {status === "IN_PROGRESS" && (
                    <>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange("TODO")}>Move to Todo</Button>
                        <Button size="sm" onClick={() => handleStatusChange("DONE")}>Mark Done</Button>
                    </>
                )}
                {status === "DONE" && (
                    <>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange("IN_PROGRESS")}>Reopen</Button>
                        <Button size="sm" onClick={() => handleStatusChange("CERTIFIED")}>Certify</Button>
                    </>
                )}
                {status === "CERTIFIED" && (
                    <>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange("DONE")}>Reject Certification</Button>
                        <Button size="sm" onClick={() => handleStatusChange("APPROVED")}>Approve</Button>
                    </>
                )}
                {status === "APPROVED" && (
                    <Button size="sm" variant="outline" disabled className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approved
                    </Button>
                )}
            </div>

            <ConfirmApprovalDialog
                open={approvalDialogOpen}
                onOpenChange={setApprovalDialogOpen}
                onConfirm={async () => await executeStatusChange("APPROVED")}
            />
        </>
    );
}
