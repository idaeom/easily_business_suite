"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { extendTaskDeadline } from "@/app/actions";
import { CalendarClock } from "lucide-react";
import { format } from "date-fns";

export function ExtendDeadlineDialog({ taskId, currentDueDate }: { taskId: string, currentDueDate?: Date | null }) {
    const [open, setOpen] = useState(false);
    const [newDate, setNewDate] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate || !reason) return;

        setLoading(true);
        try {
            await extendTaskDeadline(taskId, newDate, reason);
            setOpen(false);
            setNewDate("");
            setReason("");
        } catch (error) {
            console.error(error);
            alert("Failed to extend deadline");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Extend Deadline
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Extend Deadline</DialogTitle>
                    <DialogDescription>
                        Current Deadline: {currentDueDate ? format(new Date(currentDueDate), "PPP") : "None"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="newDate">New Deadline</Label>
                            <Input
                                id="newDate"
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason for Extension</Label>
                            <Textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Why is this extension needed?"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Extend"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
