"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { CheckCircle2, FolderKanban, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Task = {
    id: string;
    uniqueNumber: string;
    title: string;
    status: string;
    stageId?: string | null;
    assignee?: { name: string | null };
    createdAt: Date;
    dueDate?: Date | null;
    subTasks?: any[];
    expenses?: any[];
};

type TaskStage = {
    id: string;
    name: string;
    color: string;
};

export function TaskList({ tasks, stages }: { tasks: Task[], stages: TaskStage[] }) {

    const getStageName = (stageId?: string | null, status?: string) => {
        if (stageId) {
            const stage = stages.find(s => s.id === stageId);
            return stage ? stage.name : status;
        }
        return status;
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks.map((task) => (
                        <TableRow key={task.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    {/* Expense Visual Cue */}
                                    {task.expenses && task.expenses.length > 0 && (
                                        <div className="flex flex-col gap-[1px] h-6 w-1">
                                            {task.expenses.map((_, i) => (
                                                <div key={i} className="flex-1 w-full bg-orange-400 rounded-full" />
                                            ))}
                                        </div>
                                    )}
                                    {task.uniqueNumber}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {task.subTasks && task.subTasks.length > 0 && (
                                        <FolderKanban className="h-4 w-4 text-indigo-500" />
                                    )}
                                    <Link href={`/dashboard/tasks/${task.id}`} className="hover:underline font-medium">
                                        {task.title}
                                    </Link>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">
                                    {getStageName(task.stageId, task.status)}
                                </Badge>
                            </TableCell>
                            <TableCell>{task.assignee?.name || "Unassigned"}</TableCell>
                            <TableCell>
                                {task.dueDate ? (
                                    <span className={task.dueDate < new Date() ? "text-red-500" : ""}>
                                        {format(task.dueDate, "MMM d")}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/dashboard/tasks/${task.id}`}>View Details</Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                    {tasks.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No tasks found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
