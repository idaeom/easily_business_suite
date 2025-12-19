"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { reconcileShift } from "@/actions/pos";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ReconcileButton({ shiftId }: { shiftId: string }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleReconcile = async () => {
        if (!confirm("Are you sure you want to reconcile this shift? This will post entries to the General Ledger.")) return;

        setLoading(true);
        try {
            await reconcileShift(shiftId);
            toast({ title: "Success", description: "Shift Reconciled & GL Posted" });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button size="sm" onClick={handleReconcile} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Reconcile
        </Button>
    );
}
