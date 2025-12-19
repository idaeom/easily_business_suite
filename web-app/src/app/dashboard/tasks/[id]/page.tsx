
import { TaskComments } from "@/components/TaskComments";
import { TaskAttachments } from "@/components/TaskAttachments";
import { TaskExpenses } from "@/components/TaskExpenses";
import { ExtendDeadlineDialog } from "@/components/ExtendDeadlineDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

import { TaskActions } from "@/components/TaskActions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { getTaskTemplates } from "@/app/actions";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";



import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, FileText } from "lucide-react";
import { TaskService } from "@/lib/tasks";

export default async function TaskDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [task, templates] = await Promise.all([
        TaskService.getTask(id),
        getTaskTemplates()
    ]);

    if (!task) {
        return <div>Task not found</div>;
    }

    // Serialize expenses to avoid Decimal issues in Client Components
    const serializedExpenses = task.expenses.map((expense: any) => ({
        ...expense,
        amount: Number(expense.amount),
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/tasks">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Board
                    </Button>
                </Link>
            </div>

            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">{task.uniqueNumber}</Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <Badge variant={task.status === "DONE" ? "default" : "secondary"}>
                        {task.status}
                    </Badge>
                    <TaskActions taskId={task.id} status={task.status} />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Download className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <a href={`/api/reports/tasks/${task.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Download PDF (Task + Expenses)
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href={`/api/reports/tasks/${task.id}/excel`} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Download Excel (Expenses)
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Description</div>
                                <div className="whitespace-pre-wrap">{task.description || "No description"}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Assignee</div>
                                <div>{task.assignee?.name || "Unassigned"}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Team</div>
                                <div>{task.team?.name || "No Team"}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Created</div>
                                <div>{format(task.createdAt, "PPP")}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Est. Duration</div>
                                    <div>{task.estimatedDuration ? `${task.estimatedDuration} mins` : "N/A"}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Due Date</div>
                                    <div className={task.originalDueDate && task.dueDate && task.dueDate > task.originalDueDate ? "text-orange-600 font-medium" : ""}>
                                        {task.dueDate ? format(task.dueDate, "PPP") : "None"}
                                    </div>
                                    {task.originalDueDate && task.dueDate && task.dueDate > task.originalDueDate && (
                                        <div className="text-xs text-muted-foreground line-through">
                                            Original: {format(task.originalDueDate, "PPP")}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="pt-2">
                                <ExtendDeadlineDialog taskId={task.id} currentDueDate={task.dueDate} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle>Sub-tasks</CardTitle>
                            <CreateTaskDialog parentId={task.id} templates={templates} />
                        </CardHeader>
                        <CardContent>
                            {task.subTasks.length > 0 ? (
                                <ul className="space-y-2">
                                    {task.subTasks.map((subTask: any) => (
                                        <li key={subTask.id} className="flex items-center justify-between p-2 py-1.5 border rounded-md text-sm bg-slate-50 dark:bg-slate-900/50">
                                            <Link href={`/dashboard/tasks/${subTask.id}`} className="hover:underline flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">{subTask.uniqueNumber}</span>
                                                {subTask.title}
                                            </Link>
                                            <Badge variant="outline" className="text-xs scale-90">{subTask.status}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">No sub-tasks.</p>
                            )}
                        </CardContent>
                    </Card>

                    <TaskExpenses
                        taskId={task.id}
                        expenses={serializedExpenses}
                        totals={task.expenseTotals}
                    />
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Attachments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TaskAttachments taskId={task.id} attachments={task.attachments} />
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Comments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TaskComments taskId={task.id} comments={task.comments} />
                        </CardContent>
                    </Card>
                </div>
            </div >
        </div >
    );
}

