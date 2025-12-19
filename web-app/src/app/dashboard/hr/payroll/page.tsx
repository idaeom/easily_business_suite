
import { getPayrollRuns } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Settings2 } from "lucide-react";

export default async function PayrollPage() {
    const runs = await getPayrollRuns();

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
