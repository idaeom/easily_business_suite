
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approvePayrollRunAction, certifyPayrollRun, rejectPayrollRun, submitPayrollRun } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ShieldCheck, Send } from "lucide-react";

export function SubmitPayrollButton({ runId }: { runId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        setLoading(true);
        try {
            await submitPayrollRun(runId);
            toast({ title: "Submitted", description: "Payroll submitted for certification." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Failed to submit." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "..." : (
                <>
                    <Send className="mr-2 h-4 w-4" /> Submit for Review
                </>
            )}
        </Button>
    );
}

export function CertifyPayrollButton({ runId }: { runId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleCertify() {
        setLoading(true);
        try {
            await certifyPayrollRun(runId);
            toast({ title: "Certified", description: "Payroll run certified." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Failed to certify." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button onClick={handleCertify} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? "..." : (
                <>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Certify Run
                </>
            )}
        </Button>
    );
}

export function ApprovePayrollButton({ runId }: { runId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleApprove() {
        setLoading(true);
        try {
            await approvePayrollRunAction(runId);
            toast({ title: "Approved", description: "Payroll approved and processed." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Failed to approve." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? "..." : (
                <>
                    <Check className="mr-2 h-4 w-4" /> Approve & Process
                </>
            )}
        </Button>
    );
}

export function RejectPayrollButton({ runId }: { runId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleReject() {
        setLoading(true);
        try {
            await rejectPayrollRun(runId);
            toast({ title: "Rejected", description: "Payroll run rejected to Draft." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Failed to reject." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button variant="destructive" onClick={handleReject} disabled={loading}>
            {loading ? "..." : (
                <>
                    <X className="mr-2 h-4 w-4" /> Reject
                </>
            )}
        </Button>
    );
}
