"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Repeat } from "lucide-react";
import { createTask } from "@/app/actions";

import { UserCombobox } from "@/components/UserCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    definitionOfDone: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurrenceInterval: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
    estimatedDuration: z.number().optional(),
    dueDate: z.string().optional(),
});

type TaskTemplate = {
    id: string;
    title: string;
    description: string | null;
    definitionOfDone: string | null;
};

export function CreateTaskDialog({ templates = [], parentId }: { templates?: TaskTemplate[], parentId?: string }) {
    const [open, setOpen] = useState(false);
    const [participants, setParticipants] = useState<{ userId: string; role: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>("");
    const [selectedRole, setSelectedRole] = useState<string>("ASSIGNEE");

    const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            isRecurring: false,
        }
    });

    const isRecurring = watch("isRecurring");

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            await createTask({
                ...data,
                participants,
                recurrenceInterval: data.isRecurring ? data.recurrenceInterval : undefined,
                parentId // Pass parentId if present
            });
            setOpen(false);
            reset();
            setParticipants([]);
        } catch (error) {
            console.error("Failed to create task:", error);
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setValue("title", template.title);
            setValue("description", template.description || "");
            setValue("definitionOfDone", template.definitionOfDone || "");
        }
    };

    const addParticipant = () => {
        if (selectedUser && selectedRole) {
            if (!participants.some(p => p.userId === selectedUser && p.role === selectedRole)) {
                setParticipants([...participants, { userId: selectedUser, role: selectedRole }]);
            }
            setSelectedUser("");
        }
    };

    const removeParticipant = (index: number) => {
        setParticipants(participants.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={parentId ? "bg-white text-black border hover:bg-slate-100" : "bg-blue-600 hover:bg-blue-700"} size={parentId ? "sm" : "default"}>
                    <Plus className="mr-2 h-4 w-4" /> {parentId ? "Add Sub-task" : "Create Task"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{parentId ? "Add Sub-task" : "Create New Task"}</DialogTitle>
                    <DialogDescription>
                        {parentId ? "Add a sub-task to break down the work." : "Add a new task with detailed roles and requirements."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {templates.length > 0 && (
                        <div className="space-y-2">
                            <Label>Use Template (Optional)</Label>
                            <Select onValueChange={handleTemplateSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            <div className="flex items-center">
                                                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                                {t.title}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="duration">Est. Duration (Minutes)</Label>
                            <Input
                                id="duration"
                                type="number"
                                placeholder="e.g. 60"
                                {...register("estimatedDuration", { valueAsNumber: true })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                {...register("dueDate")}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" {...register("title")} placeholder="e.g., Design Homepage" />
                        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register("description")} placeholder="Task details..." />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="definitionOfDone">Definition of Done (Optional)</Label>
                        <Textarea
                            id="definitionOfDone"
                            {...register("definitionOfDone")}
                            placeholder="- Code reviewed&#10;- Unit tests passed&#10;- Deployed to staging"
                            className="h-24"
                        />
                    </div>

                    <div className="flex items-center space-x-2 border p-3 rounded-md">
                        <Checkbox
                            id="isRecurring"
                            checked={isRecurring}
                            onCheckedChange={(checked) => setValue("isRecurring", checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label
                                htmlFor="isRecurring"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Recurring Task
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                This task will repeat automatically.
                            </p>
                        </div>
                    </div>

                    {isRecurring && (
                        <div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
                            <Label>Recurrence Interval</Label>
                            <Select onValueChange={(val) => setValue("recurrenceInterval", val as any)} defaultValue="WEEKLY">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select interval" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DAILY">Daily</SelectItem>
                                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                    <SelectItem value="YEARLY">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Participants & Roles</Label>
                        <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">User</Label>
                                <UserCombobox value={selectedUser} onChange={setSelectedUser} />
                            </div>
                            <div className="w-[140px] space-y-1">
                                <Label className="text-xs text-muted-foreground">Role</Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ASSIGNOR">Assignor</SelectItem>
                                        <SelectItem value="ASSIGNEE">Assignee</SelectItem>
                                        <SelectItem value="CERTIFIER">Certifier</SelectItem>
                                        <SelectItem value="APPROVER">Approver</SelectItem>
                                        <SelectItem value="OBSERVER">Observer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="button" onClick={addParticipant} disabled={!selectedUser}>Add</Button>
                        </div>

                        {participants.length > 0 && (
                            <div className="mt-4 space-y-2 border rounded-md p-2">
                                {participants.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                                        <span>
                                            <span className="font-medium">{p.role}:</span> User ID {p.userId.slice(0, 8)}...
                                        </span>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeParticipant(i)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
