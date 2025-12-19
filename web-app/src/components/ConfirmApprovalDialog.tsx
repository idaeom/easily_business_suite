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
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface ConfirmApprovalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    title?: string;
    description?: string;
}

export function ConfirmApprovalDialog({
    open,
    onOpenChange,
    onConfirm,
    title = "Approve Task",
    description = "Are you sure you want to approve this task? This action cannot be undone.",
}: ConfirmApprovalDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t-4 border-t-green-500 shadow-2xl sm:max-w-[425px]">
                <AlertDialogHeader>
                    <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-4 w-fit">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <AlertDialogTitle className="text-center text-xl font-bold text-slate-900 dark:text-slate-100">
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-slate-600 dark:text-slate-400">
                        {description}
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md flex items-start text-left text-sm text-amber-800 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>
                                <strong>Warning:</strong> Once approved, this task will be locked and cannot be moved back to other stages.
                            </span>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
                    <AlertDialogCancel disabled={loading} className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={loading}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg shadow-green-500/20 transition-all hover:scale-105"
                    >
                        {loading ? "Approving..." : "Confirm Approval"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
