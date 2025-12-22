"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createEmployeeProfile } from "@/actions/hr";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface User {
    id: string;
    name: string | null;
    email: string;
}

export default function EmployeeOnboardingForm({ users }: { users: User[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    async function onSubmit(formData: FormData) {
        setLoading(true);
        try {
            const data = {
                userId: selectedUserId,
                jobTitle: formData.get("jobTitle") as string,
                employmentType: formData.get("employmentType") as any,
                basicSalary: Number(formData.get("basicSalary")),
                housingAllowance: Number(formData.get("housingAllowance")),
                transportAllowance: Number(formData.get("transportAllowance")),
                otherAllowances: Number(formData.get("otherAllowances")),
                isPensionActive: formData.get("isPensionActive") === "on",
                pensionVoluntary: Number(formData.get("pensionVoluntary")),
                bankName: formData.get("bankName") as string,
                accountNumber: formData.get("accountNumber") as string,
                pfaName: formData.get("pfaName") as string,
                pfaCode: formData.get("pfaCode") as string,
                pensionId: formData.get("pensionId") as string,
                taxId: formData.get("taxId") as string,
            };

            if (!data.userId) throw new Error("Please select a user to onboard.");

            await createEmployeeProfile(data);

            toast({
                title: "Success",
                description: "Employee profile created successfully.",
            });
            router.push("/dashboard/hr/employees");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create profile.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    if (users.length === 0) {
        return (
            <div className="text-center p-8 bg-muted rounded-md">
                <p className="text-muted-foreground mb-4">No eligible users found for onboarding.</p>
                <Button variant="outline" onClick={() => router.push("/dashboard/settings/users?newUser=true")}>
                    Create New User First
                </Button>
            </div>
        );
    }

    return (
        <form action={onSubmit} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>User Selection</CardTitle>
                    <CardDescription>Select a system user to onboard as an employee.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="user">User</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select user..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name || u.email} ({u.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="jobTitle">Job Title</Label>
                                <Input id="jobTitle" name="jobTitle" required placeholder="e.g. Sales Manager" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="employmentType">Employment Type</Label>
                                <Select name="employmentType" defaultValue="FULL_TIME">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                                        <SelectItem value="CONTRACT">Contract</SelectItem>
                                        <SelectItem value="INTERN">Intern</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Compensation (Monthly)</CardTitle>
                    <CardDescription>Define the salary structure. Annual values are calculated automatically.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="basicSalary">Basic Salary (₦)</Label>
                            <Input id="basicSalary" name="basicSalary" type="number" required min="0" defaultValue="0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="housingAllowance">Housing Allowance (₦)</Label>
                            <Input id="housingAllowance" name="housingAllowance" type="number" min="0" defaultValue="0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transportAllowance">Transport Allowance (₦)</Label>
                            <Input id="transportAllowance" name="transportAllowance" type="number" min="0" defaultValue="0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="otherAllowances">Other Allowances (₦)</Label>
                            <Input id="otherAllowances" name="otherAllowances" type="number" min="0" defaultValue="0" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Statutory & Bank Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 pb-4 border-b">
                        <input type="checkbox" id="isPensionActive" name="isPensionActive" className="h-4 w-4 rounded border-gray-300" defaultChecked />
                        <Label htmlFor="isPensionActive">Enable Automatic Pension Deduction (8%)</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pensionVoluntary">Voluntary Pension (₦)</Label>
                            <Input id="pensionVoluntary" name="pensionVoluntary" type="number" min="0" defaultValue="0" placeholder="Optional" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taxId">Tax ID (TIN/JTB)</Label>
                            <Input id="taxId" name="taxId" placeholder="Optional" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="pensionId">Pension RSA ID</Label>
                            <Input id="pensionId" name="pensionId" placeholder="PEN12345678" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pfaName">PFA Name</Label>
                            <Input id="pfaName" name="pfaName" placeholder="e.g. Stanbic IBTC Pension" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input id="bankName" name="bankName" required placeholder="e.g. GTBank" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input id="accountNumber" name="accountNumber" required placeholder="0123456789" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Complete Onboarding
                </Button>
            </div>
        </form>
    );
}
