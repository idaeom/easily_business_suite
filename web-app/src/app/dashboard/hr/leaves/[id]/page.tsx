
import { getDb } from "@/db";
import { leaveRequests, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ApproveLeaveButton, RejectLeaveButton, CertifyLeaveButton } from "@/components/hr/LeaveActionButtons";
import { LeaveComments } from "@/components/hr/LeaveComments";

export default async function LeaveDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const db = await getDb();

    const request = await db.query.leaveRequests.findFirst({
        where: eq(leaveRequests.id, id),
        with: { user: true }
    });

    if (!request) notFound();

    const { CollaborationService } = await import("@/lib/collaboration");
    const comments = await CollaborationService.getLeaveRequestComments(id);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Leave Request Details</h2>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Request by {request.user?.name}</span>
                        <Badge variant={request.status === "APPROVED" ? "default" : request.status === "REJECTED" ? "destructive" : "outline"}>
                            {request.status}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="font-semibold text-muted-foreground mr-2">Type:</span>
                            {request.type}
                        </div>
                        <div>
                            <span className="font-semibold text-muted-foreground mr-2">Dates:</span>
                            {format(new Date(request.startDate), "MMM d, yyyy")} - {format(new Date(request.endDate), "MMM d, yyyy")}
                        </div>
                        <div className="col-span-2">
                            <span className="font-semibold text-muted-foreground mr-2">Reason:</span>
                            <p className="mt-1 p-3 bg-muted rounded-md">{request.reason}</p>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t">
                        {request.status === "PENDING_CERTIFICATION" && (
                            <CertifyLeaveButton requestId={request.id} />
                        )}
                        {request.status === "PENDING_APPROVAL" && (
                            <ApproveLeaveButton requestId={request.id} />
                        )}
                        {["PENDING_CERTIFICATION", "PENDING_APPROVAL"].includes(request.status) && (
                            <RejectLeaveButton requestId={request.id} />
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                    <LeaveComments requestId={request.id} comments={comments} />
                </CardContent>
            </Card>
        </div>
    );
}
