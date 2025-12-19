
import React from 'react';
import { formatCurrency } from "@/lib/utils";

interface ZReportData {
    shiftId: string;
    openedAt: string | Date;
    closedAt?: string | Date;
    startCash: number;
    grossSales: number;
    netSales: number;
    totalTax: number;
    totalDiscount: number;
    totalRefunds: number;
    transactionCount: number;
    cashSales: number;
    cashRefunds: number;
    expectedDrawer: number;
}

export const ZReportPrint = React.forwardRef<HTMLDivElement, { data: ZReportData; user: string }>(({ data, user }, ref) => {
    return (
        <div ref={ref} className="p-8 max-w-[80mm] mx-auto bg-white text-sm font-mono leading-tight print:block hidden">
            <div className="text-center border-b pb-2 mb-2">
                <h2 className="font-bold text-lg">Z-Report</h2>
                <div className="text-xs">{data.shiftId}</div>
            </div>

            <div className="space-y-1 mb-4 text-xs">
                <div className="flex justify-between"><span>Open:</span> <span>{new Date(data.openedAt).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Close:</span> <span>{data.closedAt ? new Date(data.closedAt).toLocaleString() : 'Open'}</span></div>
                <div className="flex justify-between"><span>Cashier:</span> <span>{user}</span></div>
            </div>

            <div className="border-b pb-2 mb-2 space-y-1">
                <div className="flex justify-between font-bold"><span>Gross Sales</span> <span>{formatCurrency(data.grossSales)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>- Tax</span> <span>{formatCurrency(data.totalTax)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>- Refunds</span> <span>{formatCurrency(data.totalRefunds)}</span></div>
                <div className="flex justify-between font-bold pt-1 border-t border-dashed"><span>Net Sales</span> <span>{formatCurrency(data.netSales)}</span></div>
            </div>

            <div className="mb-4 space-y-1">
                <div className="flex justify-between"><span>Total Transactions</span> <span>{data.transactionCount}</span></div>
                <div className="flex justify-between"><span>Discounts Given</span> <span>{formatCurrency(data.totalDiscount)}</span></div>
            </div>

            <div className="border-t pt-2 mb-2 space-y-1">
                <h3 className="font-bold underline text-xs">Cash Drawer</h3>
                <div className="flex justify-between"><span>Opening Float</span> <span>{formatCurrency(data.startCash)}</span></div>
                <div className="flex justify-between"><span>+ Cash Sales</span> <span>{formatCurrency(data.cashSales)}</span></div>
                <div className="flex justify-between"><span>- Cash Refunds</span> <span>{formatCurrency(data.cashRefunds)}</span></div>
                <div className="flex justify-between font-bold pt-1 border-t border-dashed"><span>Expected Cash</span> <span>{formatCurrency(data.expectedDrawer)}</span></div>
            </div>

            <div className="text-center text-[10px] mt-6 border-t pt-2">
                *** END OF REPORT ***
            </div>
        </div>
    );
});
ZReportPrint.displayName = "ZReportPrint";
