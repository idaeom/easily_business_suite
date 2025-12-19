
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPendingLeaves, getPendingAppraisals, getPayrollRuns } from "@/app/actions"; // We need getPendingPayroll ideally
import { format } from "date-fns";
import { Check, ClipboardList, Banknote, UserCog } from "lucide-react";

export default async function CentralApprovalsPage() {
    // 1. Fetch Pending Items
    // We already have actions for Leave and Appraisals.
    // For Payroll, we can filter getPayrollRuns or create a specific one.
    // For Profile Changes, we need an action.

    // Let's assume we can fetch them. If not, I'll add actions.
    const pendingLeaves = await getPendingLeaves();
    const pendingAppraisals = await getPendingAppraisals();

    // Filter Payroll manually for now (optimization: add getPendingPayrollRuns)
    const allPayrollRuns = await getPayrollRuns();
    const pendingPayroll = allPayrollRuns.filter((r: any) => ["PENDING_CERTIFICATION", "PENDING_APPROVAL"].includes(r.status));

    // Profile Changes (Need action)
    const { getPendingProfileChanges } = await import("@/app/actions");
    let pendingProfiles: any[] = [];
    try {
        pendingProfiles = await getPendingProfileChanges();
    } catch (e) {
        pendingProfiles = [];
    }

    const totalCount = pendingLeaves.length + pendingAppraisals.length + pendingPayroll.length + pendingProfiles.length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Approvals Dashboard</h2>
                <Badge variant="secondary" className="text-base px-3 py-1">
                    {totalCount} Pending Requests
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingLeaves.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Appraisals</CardTitle>
                        <Check className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingAppraisals.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Payroll Runs</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingPayroll.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Profile Changes</CardTitle>
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingProfiles.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="leaves" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="leaves">Leaves</TabsTrigger>
                    <TabsTrigger value="appraisals">Appraisals</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
                    <TabsTrigger value="profiles">Profile Changes</TabsTrigger>
                </TabsList>

                <TabsContent value="leaves">
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingLeaves.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">No pending leaves.</TableCell>
                                        </TableRow>
                                    )}
                                    {pendingLeaves.map((leave: any) => (
                                        <TableRow key={leave.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={leave.user?.image} />
                                                        <AvatarFallback>{leave.user?.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>{leave.user?.name}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{leave.type}</TableCell>
                                            <TableCell>
                                                {format(new Date(leave.startDate), "MMM d")} - {format(new Date(leave.endDate), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{leave.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={`/dashboard/hr/leaves/${leave.id}`}>Review</a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appraisals">
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Score</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingAppraisals.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">No pending appraisals.</TableCell>
                                        </TableRow>
                                    )}
                                    {pendingAppraisals.map((app: any) => (
                                        <TableRow key={app.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={app.user?.image} />
                                                        <AvatarFallback>{app.user?.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>{app.user?.name}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{app.period}</TableCell>
                                            <TableCell>{app.score}</TableCell>
                                            <TableCell><Badge variant="outline">{app.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={`/dashboard/hr/appraisals/${app.id}`}>Review</a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payroll">
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Total Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingPayroll.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">No pending payroll runs.</TableCell>
                                        </TableRow>
                                    )}
                                    {pendingPayroll.map((run: any) => (
                                        <TableRow key={run.id}>
                                            <TableCell>{run.month}/{run.year}</TableCell>
                                            <TableCell>₦{Number(run.totalAmount).toLocaleString()}</TableCell>
                                            <TableCell><Badge variant="outline">{run.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={`/dashboard/hr/payroll/${run.id}`}>Review</a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profiles">
                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingProfiles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">No pending profile changes.</TableCell>
                                        </TableRow>
                                    )}
                                    {pendingProfiles.map((req: any) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={req.user?.image} />
                                                        <AvatarFallback>{req.user?.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>{req.user?.name}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{req.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={`/dashboard/hr/employees/${req.userId}`}>Review</a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
