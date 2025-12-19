"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateTaskStatus } from "@/app/actions";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, FolderKanban, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

type Task = {
    id: string;
    uniqueNumber: string;
    title: string;
    status: "TODO" | "IN_PROGRESS" | "DONE" | "CERTIFIED" | "APPROVED";
    stageId?: string | null;
    assignee?: { name: string | null };
    createdAt: Date;
    subTasks?: any[];
    expenses?: any[];
};

const COLUMNS = [
    { id: "TODO", title: "To Do", color: "bg-slate-100 dark:bg-slate-900" },
    { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-50 dark:bg-blue-950/30" },
    { id: "DONE", title: "Done", color: "bg-green-50 dark:bg-green-950/30" },
    { id: "CERTIFIED", title: "Certified", color: "bg-purple-50 dark:bg-purple-950/30" },
    { id: "APPROVED", title: "Approved", color: "bg-yellow-50 dark:bg-yellow-950/30" },
];

type TaskStage = {
    id: string;
    name: string;
    color: string;
};

import { ConfirmApprovalDialog } from "@/components/ConfirmApprovalDialog";

// ... existing imports

export function TaskBoard({ tasks: initialTasks, stages }: { tasks: Task[], stages: TaskStage[] }) {
    const [tasks, setTasks] = useState(initialTasks);
    const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; taskId: string | null; newStageId: string | null }>({
        open: false,
        taskId: null,
        newStageId: null
    });

    // Use dynamic stages if provided, otherwise fallback (though we should always provide them now)
    const columns = stages.length > 0 ? stages.map(s => ({
        id: s.id,
        title: s.name,
        color: s.color
    })) : COLUMNS;

    const handleMoveTask = async (taskId: string, newStageId: string) => {
        // Find the task
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Prevent moving OUT of APPROVED
        if (task.status === "APPROVED" || (task.stageId && stages.find(s => s.id === task.stageId)?.name === "Approved")) {
            alert("Approved tasks cannot be moved.");
            return;
        }

        // Check if moving TO APPROVED
        const isApproving = newStageId === "APPROVED" || stages.find(s => s.id === newStageId)?.name === "Approved"; // Naive check, ideally use ID or flag

        if (isApproving) {
            setApprovalDialog({ open: true, taskId, newStageId });
            return;
        }

        await executeMove(taskId, newStageId);
    };

    const executeMove = async (taskId: string, newStageId: string) => {
        // Optimistic update
        const updatedTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, stageId: newStageId, status: newStageId === "APPROVED" ? "APPROVED" : task.status } : task
        );
        setTasks(updatedTasks);

        try {
            await updateTaskStatus(taskId, newStageId);
        } catch (error) {
            console.error("Failed to update task status:", error);
            setTasks(initialTasks);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const newStageId = destination.droppableId;
        await handleMoveTask(draggableId, newStageId);
    };

    const getTasksByStatus = (columnId: string) => {
        if (stages.length > 0) {
            return tasks.filter((task) => task.stageId === columnId);
        }
        return tasks.filter((task) => task.status === columnId);
    };

    function hexToRgba(hex: string, alpha: number) {
        if (!hex || !hex.startsWith("#")) return hex;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return (
        <>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full gap-4 overflow-x-auto pb-4">
                    {columns.map((column) => {
                        const isHex = column.color.startsWith("#");
                        const style = isHex ? {
                            backgroundColor: hexToRgba(column.color, 0.1), // 10% opacity
                            borderTop: `3px solid ${column.color}`
                        } : {};

                        const className = `flex-shrink-0 w-80 rounded-lg p-4 ${!isHex ? column.color : "bg-slate-50 dark:bg-slate-900"}`;

                        return (
                            <div key={column.id} className={className} style={style}>
                                <h3 className="font-semibold mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {column.title}
                                        <HoverCard>
                                            <HoverCardTrigger>
                                                <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-64">
                                                <p className="text-sm">
                                                    {column.id === "TODO" && "Tasks that are planned but not yet started."}
                                                    {column.id === "IN_PROGRESS" && "Tasks currently being worked on."}
                                                    {column.id === "DONE" && "Work is complete but pending review."}
                                                    {column.id === "CERTIFIED" && "Verified by a supervisor as correct."}
                                                    {column.id === "APPROVED" && "Final approval. No further changes allowed."}
                                                    {!["TODO", "IN_PROGRESS", "DONE", "CERTIFIED", "APPROVED"].includes(column.id) && "Custom workflow stage."}
                                                </p>
                                            </HoverCardContent>
                                        </HoverCard>
                                    </div>
                                    <Badge variant="secondary" className="bg-white/50">{getTasksByStatus(column.id).length}</Badge>
                                </h3>
                                <Droppable droppableId={column.id} isDropDisabled={false}>
                                    {(provided) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="space-y-3 min-h-[200px]"
                                        >
                                            {getTasksByStatus(column.id).map((task, index) => (
                                                <Draggable
                                                    key={task.id}
                                                    draggableId={task.id}
                                                    index={index}
                                                    isDragDisabled={task.status === "APPROVED"} // Disable drag for approved tasks
                                                >
                                                    {(provided) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative overflow-hidden ${task.status === "APPROVED" ? "opacity-80 bg-slate-50" :
                                                                (task.subTasks && task.subTasks.length > 0) ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800" : ""
                                                                }`}
                                                        >
                                                            {/* Expense Lines */}
                                                            {task.expenses && task.expenses.length > 0 && (
                                                                <div className="absolute top-0 left-0 w-1 h-full flex flex-col gap-[1px]">
                                                                    {task.expenses.map((exp, i) => (
                                                                        <div key={exp.id || i} className="w-full h-4 bg-rose-500 rounded-r-sm" title="Has Expense" />
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <CardContent className="p-4 space-y-2 pl-5"> {/* Added padding-left for expense lines */}
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <Link href={`/dashboard/tasks/${task.id}`} className="font-medium hover:underline line-clamp-2 text-sm">
                                                                        {task.title}
                                                                    </Link>
                                                                    <div className="flex-shrink-0 flex gap-1">
                                                                        {task.subTasks && task.subTasks.length > 0 && (
                                                                            <span title="Project / Has Subtasks">
                                                                                <FolderKanban className="h-4 w-4 text-indigo-500" />
                                                                            </span>
                                                                        )}
                                                                        {task.status === "APPROVED" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                                    <span>{task.uniqueNumber}</span>
                                                                    <span>{task.assignee?.name || "Unassigned"}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between mt-2">
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            disabled={columns.findIndex(c => c.id === column.id) === 0 || task.status === "APPROVED"}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const currentIndex = columns.findIndex(c => c.id === column.id);
                                                                                if (currentIndex > 0) {
                                                                                    const prevStageId = columns[currentIndex - 1].id;
                                                                                    handleMoveTask(task.id, prevStageId);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <ChevronLeft className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            disabled={columns.findIndex(c => c.id === column.id) === columns.length - 1 || task.status === "APPROVED"}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const currentIndex = columns.findIndex(c => c.id === column.id);
                                                                                if (currentIndex < columns.length - 1) {
                                                                                    const nextStageId = columns[currentIndex + 1].id;
                                                                                    handleMoveTask(task.id, nextStageId);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>

            <ConfirmApprovalDialog
                open={approvalDialog.open}
                onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, open }))}
                onConfirm={async () => {
                    if (approvalDialog.taskId && approvalDialog.newStageId) {
                        await executeMove(approvalDialog.taskId, approvalDialog.newStageId);
                    }
                }}
            />
        </>
    );
}
