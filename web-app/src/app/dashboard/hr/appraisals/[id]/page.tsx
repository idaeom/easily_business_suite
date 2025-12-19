
import { getDb } from "@/db";
import { appraisals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ApproveAppraisalButton, RejectAppraisalButton, CertifyAppraisalButton } from "@/components/hr/AppraisalActionButtons";
import { AppraisalComments } from "@/components/hr/AppraisalComments";
import { Star } from "lucide-react";

export default async function AppraisalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const db = await getDb();

    const appraisal = await db.query.appraisals.findFirst({
        where: eq(appraisals.id, id),
        with: { user: true, reviewer: true }
    });

    if (!appraisal) notFound();

    const { CollaborationService } = await import("@/lib/collaboration");
    const comments = await CollaborationService.getAppraisalComments(id);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Appraisal Details</h2>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Appraisal for {appraisal.user?.name}</span>
                        <Badge variant={appraisal.status === "APPROVED" ? "default" : appraisal.status === "REJECTED" ? "destructive" : "outline"}>
                            {appraisal.status}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="font-semibold text-muted-foreground mr-2">Reviewer:</span>
                            {appraisal.reviewer?.name}
                        </div>
                        <div>
                            <span className="font-semibold text-muted-foreground mr-2">Period:</span>
                            {appraisal.period}
                        </div>
                        <div>
                            <span className="font-semibold text-muted-foreground mr-2">Score:</span>
                            <span className="inline-flex items-center gap-1 font-bold">
                                {appraisal.score} <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </span>
                        </div>
                        {appraisal.objectiveScore && (
                            <div>
                                <span className="font-semibold text-muted-foreground mr-2">Objective Score:</span>
                                {appraisal.objectiveScore}/10
                            </div>
                        )}
                        <div className="col-span-2 space-y-2">
                            <span className="font-semibold text-muted-foreground">Feedback:</span>
                            {appraisal.hrComment ? (
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-md whitespace-pre-wrap">
                                    {appraisal.hrComment}
                                </div>
                            ) : (
                                <p className="mt-1 p-3 bg-muted rounded-md">{appraisal.comments}</p>
                            )}
                        </div>

                        {/* KPI Breakdown could go here */}
                        {appraisal.kpis && appraisal.kpis.length > 0 && (
                            <div className="col-span-2 space-y-2">
                                <span className="font-semibold text-muted-foreground">KPI Breakdown:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {appraisal.kpis.map((kpi: any, idx: number) => (
                                        <div key={idx} className="flex justify-between p-2 bg-muted/50 rounded-md border">
                                            <span>{kpi.name}</span>
                                            <span className="font-bold">{kpi.score}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t">
                        {appraisal.status === "PENDING_CERTIFICATION" && (
                            <CertifyAppraisalButton appraisalId={appraisal.id} />
                        )}
                        {appraisal.status === "PENDING_APPROVAL" && (
                            <ApproveAppraisalButton appraisalId={appraisal.id} />
                        )}
                        {["PENDING_CERTIFICATION", "PENDING_APPROVAL"].includes(appraisal.status) && (
                            <RejectAppraisalButton appraisalId={appraisal.id} />
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                    <AppraisalComments appraisalId={appraisal.id} comments={comments} />
                </CardContent>
            </Card>
        </div>
    );
}
