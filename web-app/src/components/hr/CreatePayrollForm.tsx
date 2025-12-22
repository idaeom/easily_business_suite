
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPayrollRun } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

export default function CreatePayrollForm() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const router = useRouter(); // Import needed

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            const run = await createPayrollRun(formData);
            toast({
                title: "Success",
                description: "Payroll run created successfully. Redirecting to review...",
            });
            if (run && run.id) {
                router.push(`/dashboard/hr/payroll/${run.id}`);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create payroll run. It might already exist.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    const currentYear = new Date().getFullYear();
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <form action={handleSubmit} className="space-y-6 max-w-md">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Month</Label>
                    <Select name="month" required defaultValue={(new Date().getMonth() + 1).toString()}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m, i) => (
                                <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Year</Label>
                    <Select name="year" required defaultValue={currentYear.toString()}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                            <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                            <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Generating..." : "Generate Draft Payroll"}
            </Button>
        </form>
    );
}
