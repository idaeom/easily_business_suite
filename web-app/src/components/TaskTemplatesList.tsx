"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createTaskTemplate, deleteTaskTemplate } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

type TaskTemplate = {
    id: string;
    title: string;
    description: string | null;
    definitionOfDone: string | null;
};

export function TaskTemplatesList({ templates }: { templates: TaskTemplate[] }) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { toast } = useToast();

    async function handleCreate(formData: FormData) {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const definitionOfDone = formData.get("definitionOfDone") as string;

        try {
            await createTaskTemplate({ title, description, definitionOfDone });
            toast({ title: "Template created" });
            setIsCreateOpen(false);
        } catch (error) {
            toast({ title: "Failed to create template", variant: "destructive" });
        }
    }

    async function handleDelete(id: string) {
        try {
            await deleteTaskTemplate(id);
            toast({ title: "Template deleted" });
        } catch (error) {
            toast({ title: "Failed to delete template", variant: "destructive" });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Templates</h3>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Task Template</DialogTitle>
                        </DialogHeader>
                        <form action={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Title</label>
                                <Input name="title" required placeholder="e.g., Bug Report" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <Textarea name="description" placeholder="Default description..." />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Definition of Done</label>
                                <Textarea name="definitionOfDone" placeholder="Checklist items..." />
                            </div>
                            <Button type="submit" className="w-full">Create Template</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                    <Card key={template.id}>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium">
                                <FileText className="h-4 w-4 inline mr-2 text-muted-foreground" />
                                {template.title}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(template.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {template.description || "No description"}
                            </p>
                            {template.definitionOfDone && (
                                <div className="mt-2 text-xs bg-muted p-2 rounded">
                                    <span className="font-semibold">DoD:</span> {template.definitionOfDone}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {templates.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                        No templates found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
