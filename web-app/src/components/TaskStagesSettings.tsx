"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTaskStage, updateTaskStage, deleteTaskStage, reorderTaskStages } from "@/app/actions";
import { Trash2, GripVertical, Plus } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type TaskStage = {
    id: string;
    name: string;
    color: string;
    order: number;
};

export function TaskStagesSettings({ initialStages }: { initialStages: TaskStage[] }) {
    const [stages, setStages] = useState(initialStages);
    const [newStageName, setNewStageName] = useState("");
    const [newStageColor, setNewStageColor] = useState("bg-slate-100");

    const handleAddStage = async () => {
        if (!newStageName) return;
        await createTaskStage(newStageName, newStageColor);
        setNewStageName("");
        // Optimistic update or wait for revalidate? For simplicity, we'll wait for revalidate via parent or router refresh
        // But since this is a client component receiving props, we might need to refresh manually or use router.refresh()
        // For now, let's just rely on the action revalidating the page.
    };

    const handleDeleteStage = async (id: string) => {
        if (confirm("Are you sure? This stage must be empty.")) {
            try {
                await deleteTaskStage(id);
                setStages(stages.filter(s => s.id !== id));
            } catch (e: any) {
                alert(e.message);
            }
        }
    };

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(stages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const updatedStages = items.map((item, index) => ({ ...item, order: index }));
        setStages(updatedStages);

        await reorderTaskStages(updatedStages.map(s => ({ id: s.id, order: s.order })));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Task Stages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Stage Name"
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                    />
                    <select
                        className="border rounded p-2"
                        value={newStageColor}
                        onChange={(e) => setNewStageColor(e.target.value)}
                    >
                        <option value="bg-slate-100">Gray</option>
                        <option value="bg-blue-50">Blue</option>
                        <option value="bg-green-50">Green</option>
                        <option value="bg-yellow-50">Yellow</option>
                        <option value="bg-purple-50">Purple</option>
                        <option value="bg-red-50">Red</option>
                    </select>
                    <Button onClick={handleAddStage}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                    </Button>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="stages">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                {stages.map((stage, index) => (
                                    <Draggable key={stage.id} draggableId={stage.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="flex items-center gap-2 p-3 border rounded-md bg-white"
                                            >
                                                <div {...provided.dragHandleProps} className="cursor-grab text-slate-400">
                                                    <GripVertical className="h-4 w-4" />
                                                </div>
                                                <div className={`w-4 h-4 rounded-full ${stage.color}`} />
                                                <span className="flex-1 font-medium">{stage.name}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteStage(stage.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </CardContent>
        </Card>
    );
}
