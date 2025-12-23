
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
import { MyLeaveList } from "@/components/hr/MyLeaveList";
import { LeaveApprovalList } from "@/components/hr/LeaveApprovalList";

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
                    <MyLeaveList requests={myRequests} />
                </TabsContent>

                <TabsContent value="approvals">
                    <LeaveApprovalList requests={pendingRequests} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
