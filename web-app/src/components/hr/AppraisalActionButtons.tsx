
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveAppraisal, certifyAppraisal, rejectAppraisal } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ShieldCheck } from "lucide-react";

export function ApproveAppraisalButton({ appraisalId }: { appraisalId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleApprove() {
        setLoading(true);
        try {
            await approveAppraisal(appraisalId);
            toast({ title: "Approved", description: "Appraisal approved." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Failed to approve." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button size="sm" onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? "..." : <Check size={16} />}
        </Button>
    );
}

export function CertifyAppraisalButton({ appraisalId }: { appraisalId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleCertify() {
        setLoading(true);
        try {
            await certifyAppraisal(appraisalId);
            toast({ title: "Certified", description: "Appraisal certified." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Failed to certify." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button size="sm" onClick={handleCertify} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? "..." : <ShieldCheck size={16} />}
        </Button>
    );
}

export function RejectAppraisalButton({ appraisalId }: { appraisalId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleReject() {
        setLoading(true);
        try {
            await rejectAppraisal(appraisalId);
            toast({ title: "Rejected", description: "Appraisal rejected." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Failed to reject." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button size="sm" variant="destructive" onClick={handleReject} disabled={loading}>
            {loading ? "..." : <X size={16} />}
        </Button>
    );
}
