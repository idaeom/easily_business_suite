"use client";

import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PayrollResult } from "@/lib/payroll-engine";

export function Payslip({ data, employeeName, employeeId, period }: { data: PayrollResult, employeeName: string, employeeId: string, period: string }) {
    if (!data) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col items-center">
            <div className="w-full flex justify-end mb-4 print:hidden">
                <Button onClick={handlePrint} variant="outline" size="sm">
                    <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
                </Button>
            </div>

            {/* A4/Paper Container */}
            <div className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[148mm] mx-auto p-8 shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full">

                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                    <div className="flex flex-col justify-center">
                        {/* Placeholder Logo */}
                        <div className="h-12 w-12 bg-slate-900 text-white flex items-center justify-center font-bold text-xl rounded-sm mb-2">
                            P
                        </div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">ProjectPro Inc.</div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Payslip</h1>
                        <p className="text-sm font-medium text-slate-500 uppercase mt-1">Period: <span className="text-slate-900">{period}</span></p>
                        <p className="text-xs text-slate-400 mt-1">Generated: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
                    <div className="border-b border-slate-100 pb-1">
                        <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Employee Name</span>
                        <span className="font-semibold text-slate-900 text-base">{employeeName}</span>
                    </div>
                    <div className="border-b border-slate-100 pb-1 text-right">
                        <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Employee ID</span>
                        <span className="font-mono text-slate-700">{employeeId.slice(0, 8).toUpperCase()}</span>
                    </div>
                    {/* Add Designation/Department placeholders if available in future */}
                </div>

                {/* Financials Table Box */}
                <div className="border border-slate-300 rounded-sm mb-8">
                    {/* Table Headers */}
                    <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-300">
                        <div className="p-2 text-xs font-bold uppercase text-slate-600 border-r border-slate-300 text-center">Earnings</div>
                        <div className="p-2 text-xs font-bold uppercase text-slate-600 text-center">Deductions</div>
                    </div>

                    <div className="grid grid-cols-2">
                        {/* Earnings Column */}
                        <div className="border-r border-slate-300">
                            <div className="p-0">
                                <LineItem label="Basic Salary" amount={data.earnings?.basic} />
                                <LineItem label="Housing Allowance" amount={data.earnings?.housing} />
                                <LineItem label="Transport Allowance" amount={data.earnings?.transport} />
                                <LineItem label="Other Allowances" amount={data.earnings?.others} />
                                {(data.earnings?.bonuses || 0) > 0 && (
                                    <LineItem label="Bonuses / Variable" amount={data.earnings.bonuses} />
                                )}
                                {/* Spacer to push total to bottom if needed, or just let it stack */}
                            </div>
                            <div className="border-t border-slate-300 bg-slate-50/50">
                                <LineItem label="Total Gross Pay" amount={data.gross} isTotal />
                            </div>
                        </div>

                        {/* Deductions Column */}
                        <div>
                            <div className="p-0">
                                <LineItem label="P.A.Y.E Tax" amount={data.tax.paye} />
                                <LineItem label="Pension Contribution (8%)" amount={data.deductions.pension} />
                                {data.deductions.nhf > 0 && <LineItem label="National Housing Fund" amount={data.deductions.nhf} />}
                                {data.deductions.nhis > 0 && <LineItem label="Health Insurance (NHIS)" amount={data.deductions.nhis} />}
                                {data.deductions.other > 0 && <LineItem label="Other Deductions" amount={data.deductions.other} />}
                            </div>
                            <div className="border-t border-slate-300 bg-slate-50/50">
                                <LineItem label="Total Deductions" amount={data.deductions.total} isTotal />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Net Pay Section */}
                <div className="flex justify-end items-center border-t-2 border-slate-900 pt-4">
                    <div className="text-right">
                        <span className="block text-xs uppercase font-bold text-slate-500 mb-1">Net Pay</span>
                        <span className="block text-4xl font-black text-slate-900 font-mono tracking-tighter">
                            {formatCurrency(data.netPay)}
                        </span>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="mt-12 pt-4 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400">
                        This is a system-generated payslip. Tax calculations are based on the currently active Finance Act provisions.
                        {data.proRataFactor < 1 && " Note: Values adjusted for pro-rata attendance."}
                    </p>
                </div>

            </div>
        </div>
    );
}

function LineItem({ label, amount, isTotal = false }: { label: string, amount: number | undefined, isTotal?: boolean }) {
    return (
        <div className={`flex justify-between items-center px-4 py-2 border-b border-slate-100 last:border-0 ${isTotal ? 'py-3' : ''}`}>
            <span className={`text-sm ${isTotal ? 'font-bold text-slate-800 uppercase text-xs' : 'text-slate-600'}`}>
                {label}
            </span>
            <span className={`text-sm font-mono ${isTotal ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                {formatCurrency(amount || 0)}
            </span>
        </div>
    );
}
