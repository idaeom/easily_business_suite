
"use client";

import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Payslip } from "./Payslip";
import { useState } from "react";

export default function PayrollItemActions({ item, period }: { item: any, period: string }) {
    const [open, setOpen] = useState(false);

    // Normalize breakdown data to match PayrollResult interface expected by Payslip
    const raw = item.breakdown || {};

    // Check if it's new structure (has 'tax.paye') or old (flight fields)
    const isNew = raw.tax && typeof raw.tax === 'object';

    const normalizedData = isNew ? raw : {
        gross: Number(item.grossPay),
        netPay: Number(item.netPay),
        allowances: {
            basic: raw.basic || 0,
            housing: raw.housing || 0,
            transport: raw.transport || 0,
            others: raw.otherAllowances || 0,
            consolidatedRelief: 0, // Legacy didn't track
            pension: 0,
            nhf: 0,
            nhis: 0,
            lifeAssurance: 0,
            totalReliefs: 0
        },
        tax: {
            paye: raw.tax || 0,
            breakdown: []
        },
        deductions: {
            pension: raw.pension || 0,
            nhf: 0,
            nhis: 0,
            other: raw.otherDeductions || 0,
            total: (raw.pension || 0) + (raw.tax || 0)
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View Payslip</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto print:border-none print:shadow-none">
                <Payslip
                    data={normalizedData}
                    employeeName={item.user?.name || "Employee"}
                    employeeId={item.user?.id || ""}
                    period={period}
                />
            </DialogContent>
        </Dialog>
    );
}
