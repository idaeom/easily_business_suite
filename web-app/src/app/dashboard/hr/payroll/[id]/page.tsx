
import { getPayrollRunDetails, getPayrollComments } from "@/app/actions";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PayrollItemActions from "@/components/hr/PayrollItemActions";
import PayrollAdjustmentSheet from "@/components/hr/PayrollAdjustmentSheet";
import { ApprovePayrollButton, CertifyPayrollButton, RejectPayrollButton, SubmitPayrollButton } from "@/components/hr/PayrollActionButtons";
import { PayrollComments } from "@/components/hr/PayrollComments";

export default async function PayrollRunDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const run = await getPayrollRunDetails(id);
    if (!run) notFound();

    const comments = await getPayrollComments(id);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Payroll Run: {run.month}/{run.year}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant={run.status === "PAID" ? "default" : run.status === "APPROVED" ? "secondary" : "outline"}>
                            {run.status}
                        </Badge>
                        {run.expenseId && (
                            <Link href={`/dashboard/expenses/${run.expenseId}`} className="text-xs text-blue-500 hover:underline">
                                View Expense Request
                            </Link>
                        )}
                        {run.expenseMeta?.salaryExpenseId && (
                            <Link href={`/dashboard/expenses/${run.expenseMeta.salaryExpenseId}`} className="text-xs text-blue-500 hover:underline">
                                [Salaries]
                            </Link>
                        )}
                        {run.expenseMeta?.taxExpenseId && (
                            <Link href={`/dashboard/expenses/${run.expenseMeta.taxExpenseId}`} className="text-xs text-blue-500 hover:underline">
                                [Tax]
                            </Link>
                        )}
                        {run.expenseMeta?.pensionExpenseId && (
                            <Link href={`/dashboard/expenses/${run.expenseMeta.pensionExpenseId}`} className="text-xs text-blue-500 hover:underline">
                                [Pension]
                            </Link>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {run.status === "DRAFT" && (
                        <SubmitPayrollButton runId={run.id} />
                    )}
                    {run.status === "PENDING_CERTIFICATION" && (
                        <>
                            <CertifyPayrollButton runId={run.id} />
                            <RejectPayrollButton runId={run.id} />
                        </>
                    )}
                    {run.status === "PENDING_APPROVAL" && (
                        <>
                            <ApprovePayrollButton runId={run.id} />
                            <RejectPayrollButton runId={run.id} />
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Payout (Net)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{Number(run.totalAmount).toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Employees Processed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{run.items.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Gross Pay</TableHead>
                                <TableHead>Tax (PAYE)</TableHead>
                                <TableHead>Pension</TableHead>
                                <TableHead>Net Pay</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {run.items.map((item) => {
                                const bd = item.breakdown as any;
                                // Handle Legacy vs New Structure
                                const tax = bd.tax?.paye !== undefined ? bd.tax.paye : bd.tax;
                                const pension = bd.deductions?.pension !== undefined ? bd.deductions.pension : bd.pension;

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.user.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.user.employeeProfile?.jobTitle}</div>
                                        </TableCell>
                                        <TableCell>₦{Number(item.grossPay).toLocaleString()}</TableCell>
                                        <TableCell className="text-red-500">- ₦{Number(tax || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-red-500">- ₦{Number(pension || 0).toLocaleString()}</TableCell>
                                        <TableCell className="font-bold">₦{Number(item.netPay).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <PayrollItemActions item={item} period={`${run.month}/${run.year}`} />
                                                {run.status === "DRAFT" && (
                                                    <PayrollAdjustmentSheet item={item} />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Approvals & Comments</CardTitle>
                </CardHeader>
                <CardContent>
                    <PayrollComments runId={run.id} comments={comments} />
                </CardContent>
            </Card>
        </div>
    );
}

