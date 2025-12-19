"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { TaskBoard } from "@/components/TaskBoard";
import { TaskList } from "@/components/TaskList";
import type { Task, TaskStage } from "@/db/schema";

// ... types ...

export function TaskContainer({ tasks, stages }: { tasks: Task[], stages: TaskStage[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const view = (searchParams.get("view") as "board" | "list") || "board";

    const setView = (newView: "board" | "list") => {
        const params = new URLSearchParams(searchParams);
        params.set("view", newView);
        // Reset limit when switching views to defaults? 
        // Or let the page handle defaults if limit is missing.
        // If switching to board, maybe force limit 15?
        // If switching to list, maybe force limit 10?
        // Let's just set the view and let the user adjust limit via pagination if needed, 
        // BUT the requirement says "Board limit to 15".
        // So we should probably unset limit so the page default takes over, OR set it explicitly.

        if (newView === "board") {
            params.set("limit", "15");
        } else {
            params.set("limit", "10");
        }

        params.set("page", "1"); // Reset page
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-end">
                <div className="flex items-center border rounded-md p-1 bg-muted/50">
                    <Button
                        variant={view === "board" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setView("board")}
                        className="h-8 px-2"
                    >
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Board
                    </Button>
                    <Button
                        variant={view === "list" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setView("list")}
                        className="h-8 px-2"
                    >
                        <List className="h-4 w-4 mr-2" />
                        List
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {view === "board" ? (
                    <TaskBoard tasks={tasks} stages={stages} />
                ) : (
                    <div className="h-full overflow-auto">
                        <TaskList tasks={tasks} stages={stages} />
                    </div>
                )}
            </div>
        </div>
    );
}
