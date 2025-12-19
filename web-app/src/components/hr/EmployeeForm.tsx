
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestProfileChange, certifyProfileChange, approveProfileChange, rejectProfileChange } from "../../app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type User = {
    id: string;
    name: string | null;
    email: string;
    employeeProfile?: any;
};

export default function EmployeeForm({ user, pendingRequest }: { user: User, pendingRequest?: any }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // If pending request exists, show that data instead of current profile
    const displayProfile = pendingRequest ? (pendingRequest.data as any) : (user.employeeProfile || {});
    const isPending = !!pendingRequest;

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            // Extract raw data object from FormData for JSON storage
            const data: any = {};
            formData.forEach((value, key) => {
                if (key !== "userId") data[key] = value;
            });

            await requestProfileChange(user.id, data);
            toast({
                title: "Request Submitted",
                description: "Profile change request has been sent for certification.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to submit request.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(action: "CERTIFY" | "APPROVE" | "REJECT") {
        if (!pendingRequest) return;
        setLoading(true);
        try {
            if (action === "CERTIFY") await certifyProfileChange(pendingRequest.id);
            if (action === "APPROVE") await approveProfileChange(pendingRequest.id);
            if (action === "REJECT") await rejectProfileChange(pendingRequest.id, "Rejected by user action");

            toast({ title: "Success", description: `Request ${action.toLowerCase()}ed successfully.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {isPending && (
                <Alert className="border-orange-500 bg-orange-50">
                    <AlertTitle className="text-orange-700 flex items-center justify-between">
                        <span>Change Request Pending</span>
                        <Badge variant="outline" className="ml-2">{pendingRequest.status}</Badge>
                    </AlertTitle>
                    <AlertDescription className="text-orange-600 mt-2">
                        There is a pending change request for this profile.
                        <div className="mt-4 flex gap-2">
                            {/* Ideally check permissions here, but Server Action enforces security. Showing buttons for visibility. */}
                            {pendingRequest.status === "PENDING_CERTIFICATION" && (
                                <Button size="sm" onClick={() => handleAction("CERTIFY")} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                                    Certify Changes
                                </Button>
                            )}
                            {pendingRequest.status === "PENDING_APPROVAL" && (
                                <Button size="sm" onClick={() => handleAction("APPROVE")} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                    Approve Final
                                </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => handleAction("REJECT")} disabled={loading}>
                                Reject
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <form action={handleSubmit} className={`space-y-6 ${isPending ? "opacity-75 pointer-events-none" : ""}`}>
                <input type="hidden" name="userId" value={user.id} />

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input disabled value={user.name || ""} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input disabled value={user.email} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Employment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input name="jobTitle" defaultValue={displayProfile.jobTitle} placeholder="e.g. Software Engineer" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Employment Type</Label>
                            <Select name="employmentType" defaultValue={displayProfile.employmentType || "FULL_TIME"}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                                    <SelectItem value="CONTRACT">Contract</SelectItem>
                                    <SelectItem value="INTERN">Intern</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Compensation (Annual)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Basic Salary</Label>
                            <Input name="basicSalary" type="number" defaultValue={displayProfile.basicSalary} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Housing Allowance</Label>
                            <Input name="housingAllowance" type="number" defaultValue={displayProfile.housingAllowance} />
                        </div>
                        <div className="space-y-2">
                            <Label>Transport Allowance</Label>
                            <Input name="transportAllowance" type="number" defaultValue={displayProfile.transportAllowance} />
                        </div>
                        <div className="space-y-2">
                            <Label>Other Allowances</Label>
                            <Input name="otherAllowances" type="number" defaultValue={displayProfile.otherAllowances} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Bank & Tax</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input name="bankName" defaultValue={displayProfile.bankName} />
                        </div>
                        <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input name="accountNumber" defaultValue={displayProfile.accountNumber} />
                        </div>
                        <div className="space-y-2">
                            <Label>Tax ID (TINLink)</Label>
                            <Input name="taxId" defaultValue={displayProfile.taxId} />
                        </div>
                        <div className="space-y-2">
                            <Label>Pension ID (RSA)</Label>
                            <Input name="pensionId" defaultValue={displayProfile.pensionId} />
                        </div>
                    </div>
                </div>

                {!isPending && (
                    <Button type="submit" disabled={loading}>
                        {loading ? "Submitting..." : "Submit Change Request"}
                    </Button>
                )}
            </form>
        </div>
    );
}
