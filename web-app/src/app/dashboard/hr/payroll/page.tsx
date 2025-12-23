import { getPayrollRuns } from "@/app/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { getDb } from "@/db";
import { expenses, accounts, businessAccounts } from "@/db/schema";
import { eq, and, like, desc, inArray } from "drizzle-orm";
import { PendingPayrollExpenses } from "@/components/hr/PendingPayrollExpenses";
import { PayrollHistoryTable } from "@/components/hr/PayrollHistoryTable";
import { Protect } from "@/components/auth/Protect";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
    const runs = await getPayrollRuns();
    const db = await getDb();

    // Fetch Pending Payroll Expenses
    // We look for PENDING status AND (Category match OR Description like 'Payroll%')
    const pendingExpenses = await db.select().from(expenses).where(and(
        eq(expenses.status, "PENDING"),
        // We can trust our creation logic: "Salaries & Wages", "Taxes", "Pension" OR Description 'Payroll: ...'
        // Let's use Description 'Payroll:' as it is most specific to the RUN.
        like(expenses.description, "Payroll:%")
    )).orderBy(desc(expenses.incurredAt));

    // Fetch Business Accounts for Payment Source
    // Fetch Business Accounts for Payment Source (With Balance from GL)
    const rawBusinessAccounts = await db.query.businessAccounts.findMany({
        where: inArray(businessAccounts.type, ["BANK", "MOMO"]),
        with: {
            glAccount: true
        }
    });

    const mappedAccounts = rawBusinessAccounts.map(acc => ({
        ...acc,
        balance: acc.glAccount.balance // Hoist balance for UI
    }));

    return (
        <div className="space-y-6">
            <Protect permission="VIEW_PAYROLL" fallback={<div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">You do not have permission to view Payroll.</div>}>
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold tracking-tight">Payroll Runs</h2>
                    <div className="flex items-center gap-2">
                        <Protect permission="PAYROLL_CREATE">
                            <Link href="/dashboard/hr/payroll/settings">
                                <Button variant="outline">
                                    <Settings2 className="w-4 h-4 mr-2" /> Settings
                                </Button>
                            </Link>
                            <Link href="/dashboard/hr/payroll/new">
                                <Button>New Payroll Run</Button>
                            </Link>
                        </Protect>
                    </div>
                </div>

                {/* NEW: Batch Payment Widget */}
                <PendingPayrollExpenses expenses={pendingExpenses} accounts={mappedAccounts} />

                <PayrollHistoryTable runs={runs} />
            </Protect>
        </div>
    );
}
