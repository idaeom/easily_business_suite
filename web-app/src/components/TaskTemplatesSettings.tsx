"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { getTaskTemplates, createTaskTemplate } from "@/app/actions";
import { Loader2, Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


export function TaskTemplatesSettings() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const { toast } = useToast();

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await getTaskTemplates();
            setTemplates(data);
        } catch (error) {
            console.error("Failed to fetch templates", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Task Templates</h3>
                <CreateTemplateDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={() => {
                        fetchTemplates();
                        setCreateOpen(false);
                    }}
                />
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                        <Card key={template.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {template.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {template.description || "No description"}
                                </p>
                                {template.estimatedDuration && (
                                    <div className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 inline-block px-2 py-1 rounded">
                                        {template.estimatedDuration} mins
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
            )}
        </div>
    );
}

function CreateTemplateDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            await createTaskTemplate({
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                definitionOfDone: formData.get("definitionOfDone") as string,
                estimatedDuration: formData.get("estimatedDuration") ? Number(formData.get("estimatedDuration")) : undefined,
            });
            toast({ title: "Success", description: "Template created successfully" });
            onSuccess();
        } catch (error) {
            toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> New Template</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Task Template</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Template Title</Label>
                        <Input id="title" name="title" required placeholder="e.g., Monthly Report" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Default Description</Label>
                        <Textarea id="description" name="description" placeholder="Task details..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="definitionOfDone">Definition of Done</Label>
                        <Textarea id="definitionOfDone" name="definitionOfDone" placeholder="- Item 1..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="estimatedDuration">Est. Duration (mins)</Label>
                            <Input id="estimatedDuration" name="estimatedDuration" type="number" />
                        </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Template
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
