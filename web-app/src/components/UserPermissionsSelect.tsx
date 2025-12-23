
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateUserPermissions } from "@/actions/users";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserPermissionsSelectProps {
    userId: string;
    currentPermissions: string[];
    currentUserId: string;
}

const PERMISSION_GROUPS = [
    {
        category: "POS & Sales",
        permissions: [
            { id: "POS_ACCESS", label: "Access POS Terminal" },
            { id: "POS_MANAGE_SHIFT", label: "Manage Shifts (Open/Close)" },
            { id: "PROCESS_SALE", label: "Process Sales" },
            { id: "REFUND_SALE", label: "Process Refunds" },
            { id: "VOID_TRANSACTION", label: "Void Transactions" },
            { id: "APPLY_DISCOUNT", label: "Apply Discounts" },
        ]
    },
    {
        category: "Inventory & Stock",
        permissions: [
            { id: "INVENTORY_VIEW", label: "View Inventory Dashboard" },
            { id: "INVENTORY_MANAGE_ITEMS", label: "Create/Edit Products" },
            { id: "INVENTORY_MANAGE_STOCK", label: "Manage Stock (GRN, Transfers)" },
            { id: "VIEW_COST_PRICE", label: "View Cost Prices" },
            { id: "MANAGE_INVENTORY", label: "Full Inventory Access (Legacy)" },
        ]
    },
    {
        category: "Finance & Reports",
        permissions: [
            { id: "VIEW_FINANCE", label: "View Financial Statements (P&L, Balance Sheet)" },
            { id: "MANAGE_ACCOUNTS", label: "Manage Chart of Accounts & Journals" },
            { id: "VIEW_REPORTS", label: "View General Reports" },
            { id: "EXPENSE_CREATE", label: "Create Expenses" },
            { id: "EXPENSE_APPROVE", label: "Approve Expenses" },
            { id: "EXPENSE_PAY", label: "Disburse Expense Funds" },
        ]
    },
    {
        category: "HR & Payroll",
        permissions: [
            { id: "MANAGE_EMPLOYEES", label: "Manage Employees" },
            { id: "HR_MANAGE_TEAMS", label: "Manage Teams/Departments" },
            { id: "HR_VIEW_SENSITIVE", label: "View Salaries & Bank Details" },
            { id: "VIEW_PAYROLL", label: "View Payroll Reports" },
            { id: "PAYROLL_CREATE", label: "Create/Run Payroll" },
            { id: "PAYROLL_APPROVE", label: "Approve Payroll Runs" },
            { id: "PAYROLL_PAY", label: "Disburse Salaries" },
            { id: "HR_LEAVE_APPROVE", label: "Approve Leaves" },
            { id: "HR_APPRAISAL_REVIEW", label: "Review Appraisals" },
        ]
    },
    {
        category: "Task Management",
        permissions: [
            { id: "TASK_VIEW", label: "View Tasks" },
            { id: "TASK_CREATE", label: "Create Tasks" },
            { id: "TASK_ASSIGN", label: "Assign Tasks" },
            { id: "TASK_STAGE_MANAGE", label: "Manage Task Stages" },
        ]
    },
    {
        category: "System Administration",
        permissions: [
            { id: "MANAGE_USERS", label: "Manage Users & Permissions" },
            { id: "MANAGE_SETTINGS", label: "Manage System Settings" },
        ]
    }
];

export function UserPermissionsSelect({ userId, currentPermissions, currentUserId }: UserPermissionsSelectProps) {
    const [permissions, setPermissions] = useState<string[]>(currentPermissions || []);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleToggle = (permissionId: string) => {
        const newPermissions = permissions.includes(permissionId)
            ? permissions.filter(p => p !== permissionId)
            : [...permissions, permissionId];

        setPermissions(newPermissions);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateUserPermissions(userId, permissions);
            toast({ title: "Success", description: "Permissions updated successfully" });
            setIsOpen(false);
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to update permissions", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                    <Shield className="mr-2 h-4 w-4" />
                    Permissions
                    {permissions.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs font-normal">
                            {permissions.length}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage User Permissions</DialogTitle>
                    <DialogDescription>
                        Configure granular access controls for this user.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    {PERMISSION_GROUPS.map((group) => (
                        <div key={group.category} className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground border-b pb-1">
                                {group.category}
                            </h4>
                            <div className="space-y-2">
                                {group.permissions.map((perm) => (
                                    <div key={perm.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`${userId}-${perm.id}`}
                                            checked={permissions.includes(perm.id)}
                                            onCheckedChange={() => handleToggle(perm.id)}
                                        />
                                        <Label
                                            htmlFor={`${userId}-${perm.id}`}
                                            className="text-sm font-normal leading-none cursor-pointer"
                                        >
                                            {perm.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
