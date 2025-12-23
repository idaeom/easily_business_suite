"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, FileText, CheckCircle, XCircle, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createRequisition, getItems, getOutlets, updateRequisitionStatus } from "@/actions/inventory";
import { Textarea } from "@/components/ui/textarea";
import { ViewToggle } from "@/components/ui/view-toggle";
import { format } from "date-fns";
import { RequisitionDetailsDialog } from "./RequisitionDetailsDialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

interface Requisition {
    id: string;
    description: string;
    totalEstimatedAmount: string;
    status: "PENDING_APPROVAL" | "APPROVED_FOR_PAYMENT" | "DISBURSED" | "GOODS_RECEIVED" | "CANCELLED";
    requesterName: string;
    createdAt: Date;
    items?: any[];
}

export default function RequisitionBoard({ data, userRole }: { data: Requisition[], userRole: "ADMIN" | "USER" }) {
    const { toast } = useToast();
    const [reqs, setReqs] = useState<Requisition[]>(data);

    // View State
    const [view, setView] = useState<"grid" | "list">("grid");
    const [selectedReq, setSelectedReq] = useState<any>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Creation State
    const [creationOpen, setCreationOpen] = useState(false);
    const [newReq, setNewReq] = useState({
        outletId: "",
        description: "",
        items: [] as { itemId: string; name: string; quantity: number; estimatedPrice: number }[]
    });
    const [availableItems, setAvailableItems] = useState<any[]>([]);
    const [outlets, setOutlets] = useState<any[]>([]);

    // Item Selection State
    const [selectedItem, setSelectedItem] = useState("");
    const [itemOpen, setItemOpen] = useState(false);
    const [qty, setQty] = useState(1);

    const isAdmin = userRole === "ADMIN";

    useEffect(() => {
        setReqs(data);
    }, [data]);

    useEffect(() => {
        if (creationOpen) {
            getItems("RESALE").then(setAvailableItems); // Or ALL items?
            getOutlets().then(setOutlets);
        }
    }, [creationOpen]);

    const handleReqUpdate = (updated: any) => {
        setReqs(reqs.map(r => r.id === updated.id ? updated : r));
    };

    const addToReq = () => {
        const item = availableItems.find(i => i.id === selectedItem);
        if (!item) return;
        setNewReq({
            ...newReq,
            items: [...newReq.items, {
                itemId: item.id,
                name: item.name,
                quantity: qty,
                estimatedPrice: parseFloat(item.costPrice || item.price)
            }]
        });
        setSelectedItem("");
        setQty(1);
    };

    const handleCreate = async () => {
        try {
            if (!newReq.outletId) {
                toast({ title: "Outlet Required", description: "Please select an outlet.", variant: "destructive" });
                return;
            }
            if (newReq.items.length === 0) {
                toast({ title: "Items Required", description: "Add at least one item.", variant: "destructive" });
                return;
            }

            await createRequisition({
                outletId: newReq.outletId,
                description: newReq.description,
                items: newReq.items.map(i => ({ itemId: i.itemId, quantity: i.quantity, estimatedPrice: i.estimatedPrice }))
            });

            toast({ title: "Success", description: "Requisition created." });
            setCreationOpen(false);
            setNewReq({ outletId: "", description: "", items: [] });
            // Should refresh data
        } catch (e) {
            toast({ title: "Error", description: "Failed to create requisition.", variant: "destructive" });
        }
    };

    const [page, setPage] = useState(1);
    const itemsPerPage = 9;

    const totalPages = Math.ceil(reqs.length / itemsPerPage);
    const paginatedReqs = reqs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Reset page if out of bounds
    useEffect(() => {
        if (page > totalPages && totalPages > 0) {
            setPage(1);
        }
    }, [reqs.length, totalPages, page]);

    // ... (keep existing creation handlers)

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId as any;

        // Optimistic Update (Global List)
        const updated = reqs.map(r => r.id === draggableId ? { ...r, status: newStatus } : r);
        setReqs(updated);

        try {
            await updateRequisitionStatus(draggableId, newStatus);
            toast({ title: "Status Updated" });
        } catch (e) {
            setReqs(reqs); // Revert
            toast({ title: "Update Failed", variant: "destructive" });
        }
    };

    const columns = [
        { id: "PENDING_APPROVAL", title: "Pending Approval" },
        { id: "APPROVED_FOR_PAYMENT", title: "Approved" },
        // { id: "DISBURSED", title: "Disbursed" }, // Maybe skip for now
        { id: "GOODS_RECEIVED", title: "Received" }
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border">
                <h3 className="text-xl font-bold">Requisitions</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">
                        {reqs.length} items
                    </span>
                    <ViewToggle view={view} onViewChange={setView} />
                    <Dialog open={creationOpen} onOpenChange={setCreationOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="w-4 h-4 mr-2" /> New Request</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create Requisition</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Outlet</Label>
                                        <Select value={newReq.outletId} onValueChange={v => setNewReq({ ...newReq, outletId: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select Outlet" /></SelectTrigger>
                                            <SelectContent>
                                                {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Description</Label>
                                        <Input value={newReq.description} onChange={e => setNewReq({ ...newReq, description: e.target.value })} placeholder="e.g. Weekly Restock" />
                                    </div>
                                </div>

                                <div className="border p-4 rounded-md space-y-4">
                                    <h4 className="font-semibold">Items</h4>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <Label>Item</Label>
                                            <Popover open={itemOpen} onOpenChange={setItemOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={itemOpen}
                                                        className="w-full justify-between"
                                                    >
                                                        {selectedItem
                                                            ? availableItems.find((i) => i.id === selectedItem)?.name
                                                            : "Select Item..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search item..." />
                                                        <CommandList>
                                                            <CommandEmpty>No item found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {availableItems.map((item) => (
                                                                    <CommandItem
                                                                        key={item.id}
                                                                        value={item.name}
                                                                        onSelect={() => {
                                                                            setSelectedItem(item.id === selectedItem ? "" : item.id);
                                                                            setItemOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                selectedItem === item.id ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {item.name} (₦{Number(item.costPrice || item.price).toLocaleString()})
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="w-24">
                                            <Label>Qty</Label>
                                            <Input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value))} />
                                        </div>
                                        <Button onClick={addToReq} variant="outline">Add</Button>
                                    </div>
                                    <div className="space-y-2">
                                        {newReq.items.map((it, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-muted p-2 rounded text-sm">
                                                <span>{it.name} (x{it.quantity})</span>
                                                {/* Hide Prices during creation? Probably fine to show. Adjust if needed. */}
                                                <span>₦{(it.estimatedPrice * it.quantity).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        {newReq.items.length > 0 && (
                                            <div className="flex justify-end font-bold pt-2 border-t">
                                                Total: ₦{newReq.items.reduce((s, i) => s + (i.quantity * i.estimatedPrice), 0).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreate}>Submit Request</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {view === "grid" ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-3 gap-4 h-[600px]">
                        {columns.map(col => (
                            <div key={col.id} className="flex flex-col bg-muted/20 rounded-lg p-4 border">
                                <h4 className="font-semibold mb-4 text-sm uppercase text-muted-foreground flex justify-between">
                                    {col.title}
                                    <Badge variant="secondary">{reqs.filter(r => r.status === col.id).length}</Badge>
                                </h4>
                                <Droppable droppableId={col.id}>
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 space-y-3">
                                            {/* Note: In Kanban, strict pagination across all cols is weird, but we render 'paginatedReqs' filtered by status. */}
                                            {paginatedReqs.filter(r => r.status === col.id).map((req, index) => (
                                                <Draggable key={req.id} draggableId={req.id} index={index}>
                                                    {(provided) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                                                            onClick={() => { setSelectedReq(req); setDetailsOpen(true); }}
                                                        >
                                                            <CardHeader className="p-4 pb-2">
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-xs text-muted-foreground">#{req.id.slice(0, 6)}</span>
                                                                    <span className="text-xs font-mono">{new Date(req.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <CardTitle className="text-sm font-medium">{req.description || "Untitled Request"}</CardTitle>
                                                            </CardHeader>
                                                            <CardContent className="p-4 pt-2">
                                                                <div className="flex justify-between items-center mt-2">
                                                                    {/* Hide Total if not Admin */}
                                                                    {isAdmin ? (
                                                                        <span className="text-sm font-bold">₦{Number(req.totalEstimatedAmount).toLocaleString()}</span>
                                                                    ) : (
                                                                        <span className="text-sm font-bold text-muted-foreground">---</span>
                                                                    )}
                                                                    <div className="text-xs text-muted-foreground">by {req.requesterName}</div>
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
                        ))}
                    </div>
                </DragDropContext>
            ) : (
                <div className="bg-white rounded-md border text-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Ref</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Requester</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead className="text-right">Total Est.</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedReqs.map((req) => (
                                <TableRow key={req.id} onClick={() => { setSelectedReq(req); setDetailsOpen(true); }} className="cursor-pointer hover:bg-slate-50">
                                    <TableCell>{format(new Date(req.createdAt), "MMM d, yyyy")}</TableCell>
                                    <TableCell className="font-mono text-xs">{req.id.slice(0, 8)}</TableCell>
                                    <TableCell className="font-medium">{req.description || "Untitled"}</TableCell>
                                    <TableCell>{req.requesterName}</TableCell>
                                    <TableCell>{req.items?.length || 0} items</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {isAdmin ? `₦${Number(req.totalEstimatedAmount).toLocaleString()}` : "---"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{req.status}</Badge>
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

            <RequisitionDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                requisition={selectedReq}
                onUpdate={handleReqUpdate}
                isAdmin={isAdmin}
            />
        </div>
    );
}
