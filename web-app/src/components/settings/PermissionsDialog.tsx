"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { PERMISSIONS, Permission } from "@/lib/permissions-constants";

interface PermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPermissions: string[];
    onSave: (permissions: string[]) => Promise<void>;
    isLoading?: boolean;
    userName?: string;
}

export function PermissionsDialog({
    open,
    onOpenChange,
    currentPermissions,
    onSave,
    isLoading,
    userName
}: PermissionsDialogProps) {
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(currentPermissions);

    // Sync when props change or dialog opens
    // Ideally use useEffect, but for now relying on remount or parent state usually works if key changes.
    // If not, we might need useEffect. Let's add it for safety.

    if (open && selectedPermissions !== currentPermissions && selectedPermissions.length === 0 && currentPermissions.length > 0) {
        // This is tricky without useEffect. Let's trust parent passes fresh list or assume state init is enough if component unmounts.
        // Actually Dialog content stays mounted usually.
        // Let's use a useEffect to sync when open changes to true.
    }

    // Better: just sync in render? No, side-effect.
    // Let's rely on standard pattern or add useEffect.

    const { useEffect } = require("react");
    useEffect(() => {
        if (open) {
            setSelectedPermissions(currentPermissions || []);
        }
    }, [open, currentPermissions]);


    const handleToggle = (permission: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(permission)
                ? prev.filter((p) => p !== permission)
                : [...prev, permission]
        );
    };

    const handleSave = () => {
        onSave(selectedPermissions);
    };

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Permissions</DialogTitle>
                    <DialogDescription>
                        Toggle specific permissions for {userName || "User"}.
                        These are additive to the user's Role.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto">
                    {PERMISSION_GROUPS.map((group) => (
                        <div key={group.category} className="space-y-3 break-inside-avoid">
                            <h4 className="font-medium text-sm text-foreground/80 border-b pb-1 sticky top-0 bg-background z-10">
                                {group.category}
                            </h4>
                            <div className="space-y-2">
                                {group.permissions.map((perm) => (
                                    <div key={perm.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={perm.id}
                                            checked={selectedPermissions.includes(perm.id)}
                                            onCheckedChange={() => handleToggle(perm.id)}
                                        />
                                        <label
                                            htmlFor={perm.id}
                                            className="text-sm leading-none cursor-pointer text-muted-foreground hover:text-foreground"
                                        >
                                            {perm.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
