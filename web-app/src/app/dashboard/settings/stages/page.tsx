import { TaskStagesSettings } from "@/components/TaskStagesSettings";
import { getTaskStages } from "@/app/actions";

export default async function TaskStagesPage() {
    const stages = await getTaskStages();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Task Stages</h2>
                <p className="text-muted-foreground">
                    Customize the columns for your Kanban board.
                </p>
            </div>
            <TaskStagesSettings initialStages={stages} />
        </div>
    );
}
