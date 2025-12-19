import { getTasks, getTaskStages, getTaskTemplates } from "@/app/actions";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { TaskContainer } from "@/components/TaskContainer";
import { Pagination } from "@/components/Pagination";

import { TaskFilters } from "@/components/TaskFilters";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const view = (params.view as "board" | "list") || "board";

    // Default limits: 15 for board (3 rows), 10 for list
    const defaultLimit = view === "board" ? 15 : 10;
    const limit = Number(params.limit) || defaultLimit;

    const search = params.search as string;
    const statusParam = params.status as string;

    let filterStatus = undefined;
    let filterStageId = undefined;

    if (statusParam && statusParam !== "ALL") {
        if (["TODO", "IN_PROGRESS", "DONE", "CERTIFIED", "APPROVED"].includes(statusParam)) {
            filterStatus = statusParam;
        } else {
            filterStageId = statusParam;
        }
    }

    const startDate = params.startDate ? new Date(params.startDate as string) : undefined;
    const endDate = params.endDate ? new Date(params.endDate as string) : undefined;

    const [{ data: tasks, total }, stages, templates] = await Promise.all([
        getTasks(page, limit, {
            search,
            status: filterStatus,
            stageId: filterStageId,
            startDate,
            endDate
        }),
        getTaskStages(),
        getTaskTemplates()
    ]);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
                    <p className="text-muted-foreground">
                        Manage your projects and assignments.
                    </p>
                </div>
                <CreateTaskDialog templates={templates} />
            </div>

            <TaskFilters stages={stages} />

            <div className="flex-1 overflow-hidden">
                <TaskContainer tasks={tasks as any} stages={stages} />
            </div>

            <Pagination currentPage={page} totalItems={total} pageSize={limit} />
        </div>
    );
}
