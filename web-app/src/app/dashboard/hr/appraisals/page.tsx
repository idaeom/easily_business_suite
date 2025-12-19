
import { getAllAppraisals, getAllEmployees, getMyAppraisals, getPendingAppraisals } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AppraisalForm from "@/components/hr/AppraisalForm";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function AppraisalsPage() {
    const myAppraisals = await getMyAppraisals();
    const allAppraisals = await getAllAppraisals(); // Note: This should ideally just be for "Team Reviews" history
    const pendingAppraisals = await getPendingAppraisals();
    const employees = await getAllEmployees();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Performace Appraisals</h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Appraisal
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Conduct New Appraisal</DialogTitle>
                        </DialogHeader>
                        <AppraisalForm employees={employees} />
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="approvals" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="approvals">Approvals ({pendingAppraisals.length})</TabsTrigger>
                    <TabsTrigger value="all">Team Reviews</TabsTrigger>
                    <TabsTrigger value="my">My Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="approvals">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Approvals/Certifications</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No pending appraisals.
                                            </TableCell>
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
                                                    <div>
                                                        <div className="font-medium">{app.user?.name}</div>
                                                        <div className="text-xs text-muted-foreground">{app.user?.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{app.period}</TableCell>
                                            <TableCell>
                                                <span className="font-bold">{app.score}</span>
                                                {app.objectiveScore && <span className="text-xs text-muted-foreground ml-1">({app.objectiveScore})</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{app.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={`/dashboard/hr/appraisals/${app.id}`}>View</a>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="my">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Performance History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead>Reviewer</TableHead>
                                        <TableHead>Feedback</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myAppraisals.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No appraisals found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {myAppraisals.map((app: any) => (
                                        <TableRow key={app.id}>
                                            <TableCell className="font-medium">{app.period}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold">{app.score}</span>
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                </div>
                                                {app.objectiveScore && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Obj: {app.objectiveScore}/10
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>{app.reviewer?.name || "Unknown"}</TableCell>
                                            <TableCell className="max-w-[400px]">
                                                {app.hrComment ? (
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Draft Report</div>
                                                        <div className="text-sm border-l-2 border-indigo-200 pl-2 whitespace-pre-wrap max-h-[100px] overflow-hidden truncate">
                                                            {app.hrComment}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground truncate">{app.comments}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>{format(new Date(app.createdAt), "MMM d, yyyy")}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Performance Reviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Reviewer</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allAppraisals.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                No appraisals completed yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {allAppraisals.map((app: any) => (
                                        <TableRow key={app.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={app.user?.image} />
                                                        <AvatarFallback>{app.user?.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium">{app.user?.name}</div>
                                                        <div className="text-xs text-muted-foreground">{app.user?.email}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{app.period}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold">{app.score}</span>
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={app.status === "APPROVED" ? "default" : app.status === "REJECTED" ? "destructive" : "outline"}>
                                                    {app.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{app.reviewer?.name}</TableCell>
                                            <TableCell>{format(new Date(app.createdAt), "MMM d, yyyy")}</TableCell>
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
