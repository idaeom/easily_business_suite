
import { getMyLeaveRequests, getPendingLeaveRequests } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import LeaveRequestForm from "@/components/hr/LeaveRequestForm";
import { ApproveLeaveButton, RejectLeaveButton, CertifyLeaveButton } from "@/components/hr/LeaveActionButtons";
import { format } from "date-fns";

export default async function LeavePage() {
    const myRequests = await getMyLeaveRequests();
    const pendingRequests = await getPendingLeaveRequests();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Leave Management</h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Request Leave
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New Leave Request</DialogTitle>
                        </DialogHeader>
                        <LeaveRequestForm />
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="my-leaves" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="my-leaves">My Leaves</TabsTrigger>
                    <TabsTrigger value="approvals">Approvals ({pendingRequests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="my-leaves">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Leave History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myRequests.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No leave requests found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {myRequests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.type}</TableCell>
                                            <TableCell>
                                                {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                {Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={req.status === "APPROVED" ? "default" : req.status === "REJECTED" ? "destructive" : "outline"}>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground truncate max-w-[200px]">{req.reason}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="approvals">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Approvals</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingRequests.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No pending requests.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {pendingRequests.map((req: any) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div className="font-medium">{req.user?.name}</div>
                                                <div className="text-xs text-muted-foreground">{req.user?.email}</div>
                                            </TableCell>
                                            <TableCell>{req.type}</TableCell>
                                            <TableCell>
                                                {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground truncate max-w-[200px]">{req.reason}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={`/dashboard/hr/leaves/${req.id}`}>View</a>
                                                </Button>
                                                {req.status === "PENDING_CERTIFICATION" && (
                                                    <CertifyLeaveButton requestId={req.id} />
                                                )}
                                                {req.status === "PENDING_APPROVAL" && (
                                                    <ApproveLeaveButton requestId={req.id} />
                                                )}
                                                <RejectLeaveButton requestId={req.id} />
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
