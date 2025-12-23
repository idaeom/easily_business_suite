import { getPayrollRuns } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Settings2 } from "lucide-react";
import { getDb } from "@/db";
import { expenses, accounts, businessAccounts } from "@/db/schema";
import { eq, and, like, desc, inArray } from "drizzle-orm";
import { PendingPayrollExpenses } from "@/components/hr/PendingPayrollExpenses";

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
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Payroll Runs</h2>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/hr/payroll/settings">
                        <Button variant="outline">
                            <Settings2 className="w-4 h-4 mr-2" /> Settings
                        </Button>
                    </Link>
                    <Link href="/dashboard/hr/payroll/new">
                        <Button>New Payroll Run</Button>
                    </Link>
                </div>
            </div>

            {/* NEW: Batch Payment Widget */}
            <PendingPayrollExpenses expenses={pendingExpenses} accounts={mappedAccounts} />

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {runs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No payroll runs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                runs.map((run) => (
                                    <TableRow key={run.id}>
                                        <TableCell className="font-medium">{run.month}/{run.year}</TableCell>
                                        <TableCell>
                                            <Badge variant={run.status === "PAID" ? "default" : run.status === "APPROVED" ? "secondary" : "outline"}>
                                                {run.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>₦{Number(run.totalAmount).toLocaleString()}</TableCell>
                                        <TableCell>{run.createdAt.toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/hr/payroll/${run.id}`}>
                                                <Button size="sm" variant="ghost">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
