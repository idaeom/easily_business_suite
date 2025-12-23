"use client";

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateDispatchStatus, assignHaulage } from "@/actions/operations";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, Package, User } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CompleteDeliveryDialog } from "./CompleteDeliveryDialog";
import { ViewToggle } from "@/components/ui/view-toggle"; // Check path
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const COLUMNS = {
    PENDING: "Pending Dispatch",
    DISPATCHED: "In Transit",
    PARTIALLY_DELIVERED: "Partially Delivered",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled"
};

export default function DispatchBoard({ dispatches, initialHaulageProviders = [] }: { dispatches: any[], initialHaulageProviders?: any[] }) {
    const { toast } = useToast();
    const [view, setView] = useState<"grid" | "list">("grid");
    const [page, setPage] = useState(1);
    const itemsPerPage = view === "grid" ? 3 : 9;

    const totalPages = Math.ceil(dispatches.length / itemsPerPage);
    const paginatedDispatches = dispatches.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
    const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
    const [assignData, setAssignData] = useState({
        haulageId: "", driverName: "", vehicleNumber: "", notes: ""
    });

    const getDispatchesByStatus = (status: string) => {
        return paginatedDispatches.filter(d => d.status === status);
    };

    const onDragEnd = async (result: any) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) return;

        // Moving to DISPATCHED requires Modal
        if (destination.droppableId === "DISPATCHED" && source.droppableId === "PENDING") {
            setSelectedDispatchId(draggableId);
            setIsAssignDialogOpen(true);
            return;
        }

        // Moving to DELIVERED requires Modal (POD)
        if (destination.droppableId === "DELIVERED" && source.droppableId !== "DELIVERED") {
            const dispatch = dispatches.find(d => d.id === draggableId); // Find in full list

            // Workflow Check: Delivery vs Pickup
            if (dispatch?.deliveryMethod === 'DELIVERY' && !dispatch.haulageId) {
                toast({ title: "Haulage Required", description: "Assign a haulage provider before confirming delivery.", variant: "destructive" });
                return;
            }

            setSelectedDispatchId(draggableId);
            setIsDeliveryDialogOpen(true);
            return;
        }

        // For other moves, we just optimistic update the SERVER, but here we can't easily optimistic update "paginatedDispatches" without complex state.
        // So we will rely on toast and server revalidation/reload.
        // Or we can assume 'updateDispatchStatus' will trigger a reload if we were using server actions properly with revalidatePath.
        // Given 'window.location.reload()' usage elsewhere, let's assume we might need to refresh or just accept the snap-back if we don't handle local state.
        // To be safe, let's just do the API call.

        try {
            await updateDispatchStatus(draggableId, destination.droppableId as any);
            toast({ title: "Status Updated" });
            // Brute force reload to reflect changes in pagination/list
            window.location.reload();
        } catch (e) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const handleAssignHaulage = async () => {
        // ... (keep existing)
        if (!assignData.haulageId || !assignData.driverName) {
            toast({ title: "Error", description: "Provider and Driver are required", variant: "destructive" });
            return;
        }

        try {
            if (!selectedDispatchId) return;
            await assignHaulage({
                dispatchId: selectedDispatchId,
                ...assignData
            });

            window.location.reload();

            toast({ title: "Dispatched", description: "Haulage Assigned Successfully" });
            setIsAssignDialogOpen(false);
        } catch (e) {
            toast({ title: "Error", description: "Assignment Failed", variant: "destructive" });
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Dispatch Operations</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">{dispatches.length} items</span>
                    <ViewToggle view={view} onViewChange={setView} />
                </div>
            </div>

            {view === "grid" ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-4 h-full overflow-x-auto pb-4">
                        {Object.entries(COLUMNS).map(([status, title]) => (
                            <div key={status} className="min-w-[300px] bg-slate-50/50 rounded-lg border p-3 flex flex-col h-full">
                                <h3 className="font-semibold text-sm mb-3 flex justify-between items-center text-slate-700">
                                    {title}
                                    <Badge variant="secondary" className="text-xs">
                                        {getDispatchesByStatus(status).length}
                                    </Badge>
                                </h3>
                                <Droppable droppableId={status}>
                                    {(provided) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="flex-1 space-y-3 min-h-[200px]"
                                        >
                                            {getDispatchesByStatus(status).map((item, index) => (
                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                    {(provided) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => {
                                                                setSelectedDispatchId(item.id);
                                                                if (item.deliveryMethod === 'DELIVERY' && !item.haulageId) {
                                                                    setIsAssignDialogOpen(true);
                                                                } else {
                                                                    setIsDeliveryDialogOpen(true);
                                                                }
                                                            }}
                                                            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer active:cursor-grabbing bg-white border-l-4 border-l-blue-500"
                                                        >
                                                            <CardContent className="p-3 space-y-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="font-medium text-sm">{item.contact?.name || item.deliveryAddress || "Unknown Customer"}</div>
                                                                        <div className="text-xs text-muted-foreground">{item.sale ? `Sale #${item.sale.id.slice(0, 8)}` : "Internal Transfer"}</div>
                                                                    </div>
                                                                    {item.status !== 'PENDING' && (
                                                                        <Truck className="h-4 w-4 text-blue-600" />
                                                                    )}
                                                                </div>

                                                                <div className="space-y-1 pt-1">
                                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                        <MapPin className="h-3 w-3" />
                                                                        <span className="truncate max-w-[200px]">{item.sale ? item.deliveryAddress : "Direct Transfer"}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                        <Package className="h-3 w-3" />
                                                                        <span>{(item.items?.length || item.sale?.items?.length) || 0} Items</span>
                                                                    </div>
                                                                </div>

                                                                {item.status === 'DISPATCHED' && item.driverName && (
                                                                    <div className="mt-2 pt-2 border-t text-xs bg-blue-50/50 p-1.5 rounded text-blue-800">
                                                                        <div className="font-semibold">{item.haulage?.providerName}</div>
                                                                        <div>Driver: {item.driverName} ({item.vehicleNumber})</div>
                                                                    </div>
                                                                )}
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
                        ))}
                    </div>
                </DragDropContext>
            ) : (
                <div className="bg-white rounded-md border text-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer / Dest.</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Haulage</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedDispatches.map(item => (
                                <TableRow key={item.id} onClick={() => {
                                    setSelectedDispatchId(item.id);
                                    if (item.deliveryMethod === 'DELIVERY' && !item.haulageId) {
                                        setIsAssignDialogOpen(true);
                                    } else {
                                        setIsDeliveryDialogOpen(true);
                                    }
                                }} className="cursor-pointer hover:bg-slate-50">
                                    <TableCell>{format(new Date(item.dispatchDate || item.createdAt), "dd MMM")}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{item.contact?.name || item.deliveryAddress}</div>
                                        <div className="text-xs text-muted-foreground">{item.sale ? item.deliveryAddress : "Internal Transfer"}</div>
                                    </TableCell>
                                    <TableCell>{(item.items?.length || item.sale?.items?.length) || 0} Items</TableCell>
                                    <TableCell>
                                        {item.haulage ? (
                                            <div className="text-xs">
                                                <div className="font-medium">{item.haulage.providerName}</div>
                                                <div>{item.driverName}</div>
                                            </div>
                                        ) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={item.status === "DELIVERED" ? "secondary" : "default"}
                                            className={item.status === "PARTIALLY_DELIVERED" ? "bg-amber-500 hover:bg-amber-600" : ""}
                                        >
                                            {item.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.status === 'PENDING' && (
                                            <Button size="sm" onClick={() => {
                                                setSelectedDispatchId(item.id);
                                                setIsAssignDialogOpen(true);
                                            }}>Dispatch</Button>
                                        )}
                                        {(item.status === 'DISPATCHED' || item.status === 'PARTIALLY_DELIVERED' || item.status === 'DELIVERED' || item.deliveryMethod === 'PICKUP') && (
                                            <Button size="sm" variant={item.status === 'DELIVERED' ? "outline" : "default"} onClick={(e) => {
                                                e.stopPropagation(); // Prevent row click
                                                setSelectedDispatchId(item.id);
                                                if (item.deliveryMethod === 'DELIVERY' && !item.haulageId) {
                                                    setIsAssignDialogOpen(true);
                                                } else {
                                                    setIsDeliveryDialogOpen(true);
                                                }
                                            }}>
                                                {item.status === 'DELIVERED' ? "POD Details" : "Log Delivery"}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm font-medium">Page {page} of {totalPages}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* ASSIGN HAULAGE DIALOG */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Haulage Provider</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Haulage Provider</Label>
                            <Select onValueChange={(val) => setAssignData({ ...assignData, haulageId: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialHaulageProviders.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.providerName} ({p.vehicleType})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Driver Name</Label>
                                <Input
                                    value={assignData.driverName}
                                    onChange={(e) => setAssignData({ ...assignData, driverName: e.target.value })}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vehicle Number</Label>
                                <Input
                                    value={assignData.vehicleNumber}
                                    onChange={(e) => setAssignData({ ...assignData, vehicleNumber: e.target.value })}
                                    placeholder="e.g. LAG-123-XY"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={assignData.notes}
                                onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAssignHaulage}>Confirm Dispatch</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
            {/* COMPLETE DELIVERY DIALOG */}
            {selectedDispatchId && (
                <CompleteDeliveryDialog
                    open={isDeliveryDialogOpen}
                    onOpenChange={setIsDeliveryDialogOpen}
                    dispatch={dispatches.find(d => d.id === selectedDispatchId)}
                    onSuccess={() => {
                        setIsDeliveryDialogOpen(false);
                        window.location.reload(); // Refresh to see status update
                    }}
                />
            )}
        </div>
    );
}
