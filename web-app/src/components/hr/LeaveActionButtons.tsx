
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveLeaveRequest, rejectLeaveRequest } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

export function ApproveLeaveButton({ requestId }: { requestId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleApprove() {
        setLoading(true);
        try {
            await approveLeaveRequest(requestId);
            toast({ title: "Approved", description: "Leave request approved." });
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

export function RejectLeaveButton({ requestId }: { requestId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    async function handleReject() {
        setLoading(true);
        try {
            await rejectLeaveRequest(requestId);
            toast({ title: "Rejected", description: "Leave request rejected." });
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

export function CertifyLeaveButton({ requestId }: { requestId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const { certifyLeaveRequest } = require("@/app/actions"); // Dynamic import or top-level? Top level is better but avoiding circular dep issues if any. Better use top import.

    async function handleCertify() {
        setLoading(true);
        try {
            await certifyLeaveRequest(requestId);
            toast({ title: "Certified", description: "Leave request certified." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Failed to certify." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button size="sm" onClick={handleCertify} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
            {loading ? "..." : "Certify"}
        </Button>
    );
}
