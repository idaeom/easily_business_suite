import { TaskTemplatesSettings } from "@/components/TaskTemplatesSettings";

export default function TemplatesSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Task Templates</h3>
                <p className="text-sm text-muted-foreground">
                    Manage reusable templates for common tasks.
                </p>
            </div>
            <TaskTemplatesSettings />
        </div>
    );
}
