
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLeaveRequest } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

export default function LeaveRequestForm({ onSuccess }: { onSuccess?: () => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState("ANNUAL");
    const [reason, setReason] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            if (!dateRange?.from || !dateRange?.to) {
                throw new Error("Please select a date range");
            }

            await createLeaveRequest(type, dateRange.from, dateRange.to, reason);
            toast({
                title: "Success",
                description: "Leave request submitted successfully.",
            });
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to submit request",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                        <SelectItem value="SICK">Sick Leave</SelectItem>
                        <SelectItem value="CASUAL">Casual Leave</SelectItem>
                        <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                        <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
                        <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Duration</Label>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full" />
            </div>

            <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you requesting leave?"
                />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Submitting..." : "Submit Request"}
            </Button>
        </form>
    );
}
