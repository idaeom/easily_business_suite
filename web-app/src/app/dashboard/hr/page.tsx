
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllEmployees, getPayrollRuns } from "@/app/actions";
import { Users, CreditCard, Banknote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HrDashboardPage() {
    const employees = await getAllEmployees();
    const payrollRuns = await getPayrollRuns();

    const activeEmployees = employees.length;
    // const pendingPayroll = payrollRuns.filter(r => r.status === "DRAFT").length;
    // Fix: payrollRuns might be undefined if getPayrollRuns fails or returns empty promise? 
    // No, returns array.

    // Quick calculations
    const lastRun = payrollRuns[0]; // Most recent

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">HR & Payroll</h1>
                    <p className="text-muted-foreground">Manage employees, payroll, and leave.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/hr/employees/new">
                        <Button>Add Employee</Button>
                    </Link>
                    <Link href="/dashboard/hr/payroll/new">
                        <Button variant="outline">Run Payroll</Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeEmployees}</div>
                        <p className="text-xs text-muted-foreground">Active staff entries</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Payroll</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{lastRun ? `₦${Number(lastRun.totalAmount).toLocaleString()}` : "N/A"}</div>
                        <p className="text-xs text-muted-foreground">
                            {lastRun ? `${lastRun.month}/${lastRun.year} - ${lastRun.status}` : "No history"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Next Pay Date</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">25th</div>
                        <p className="text-xs text-muted-foreground">Approx. disbursement date</p>
                    </CardContent>
                </Card>
            </div>

            {/* Sub-Navigation or Quick Links Section could go here if Layout doesn't handle it */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Payroll Runs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {payrollRuns.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No payroll runs found.</p>
                        ) : (
                            <ul className="space-y-2">
                                {payrollRuns.slice(0, 5).map(run => (
                                    <li key={run.id} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                            <p className="font-medium">{run.month}/{run.year}</p>
                                            <p className="text-sm text-muted-foreground">{run.status}</p>
                                        </div>
                                        <div className="text-right">
                                            <p>₦{Number(run.totalAmount).toLocaleString()}</p>
                                            <Link href={`/dashboard/hr/payroll/${run.id}`} className="text-xs text-blue-500 hover:underline">View</Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
