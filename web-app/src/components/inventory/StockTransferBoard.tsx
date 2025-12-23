
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createTransfer, receiveTransfer } from "@/actions/inventory";
import { ArrowRightLeft, Truck, PackageOpen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IncomingTransfersSection } from "./IncomingTransfersSection";

interface Transfer {
    id: string;
    sourceOutletId: string;
    destinationOutletId: string;
    status: string;
    type: string;
    items: any[];
    createdAt: Date;
    notes?: string;
    grns?: { itemsLogged: any[] }[]; // From relation
}

export function StockTransferBoard({ transfers, outlets, items, currentOutletId }: { transfers: Transfer[], outlets: any[], items: any[], currentOutletId: string }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Receive Dialog State
    const [receiveOpen, setReceiveOpen] = useState(false);
    const [activeTransfer, setActiveTransfer] = useState<Transfer | null>(null);
    const [receiveItems, setReceiveItems] = useState<{ itemId: string; quantity: number; condition: string; maxQty: number }[]>([]);

    // Create Form State
    const [targetOutlet, setTargetOutlet] = useState("");
    const [transferType, setTransferType] = useState<"DISPATCH" | "PICKUP">("DISPATCH");
    const [selectedItems, setSelectedItems] = useState<{ itemId: string; quantity: number }[]>([{ itemId: "", quantity: 1 }]);
    const [notes, setNotes] = useState("");

    const handleAddItem = () => setSelectedItems([...selectedItems, { itemId: "", quantity: 1 }]);

    const handleCreateTransfer = async () => {
        if (!targetOutlet || selectedItems.some(i => !i.itemId || i.quantity <= 0)) {
            toast({ title: "Validation Error", description: "Check outlet and items.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await createTransfer({
                sourceOutletId: currentOutletId,
                destinationOutletId: targetOutlet,
                items: selectedItems,
                type: transferType,
                notes
            });
            toast({ title: "Transfer Created", description: "Stock reserved and transfer initiated." });
            setOpen(false);
            setTargetOutlet("");
            setSelectedItems([{ itemId: "", quantity: 1 }]);
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed to create transfer.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const openReceiveDialog = (transfer: Transfer) => {
        // Calculate remaining quantities
        const receivedMap = new Map<string, number>();
        if (transfer.grns) {
            transfer.grns.forEach(grn => {
                grn.itemsLogged.forEach((i: any) => {
                    const current = receivedMap.get(i.itemId) || 0;
                    receivedMap.set(i.itemId, current + Number(i.quantityReceived));
                });
            });
        }

        const itemsToReceive = transfer.items.map((i: any) => {
            const received = receivedMap.get(i.itemId) || 0;
            const remaining = Number(i.quantity) - received;
            return {
                itemId: i.itemId,
                quantity: remaining > 0 ? remaining : 0, // Default to remaining
                maxQty: remaining,
                condition: "GOOD"
            };
        }).filter(i => i.maxQty > 0); // Only show items that still need reference

        if (itemsToReceive.length === 0) {
            toast({ title: "Already Completed", description: "All items have been received." });
            return;
        }

        setActiveTransfer(transfer);
        setReceiveItems(itemsToReceive);
        setReceiveOpen(true);
    };

    const handleSubmitReceive = async () => {
        if (!activeTransfer) return;
        setLoading(true);
        try {
            // Filter out 0 quantity (user might not want to receive everything now)
            const payloadItems = receiveItems
                .filter(i => i.quantity > 0)
                .map(i => ({ itemId: i.itemId, quantity: i.quantity, condition: i.condition }));

            if (payloadItems.length === 0) {
                toast({ title: "Validation", description: "Enter quantity to receive", variant: "destructive" });
                setLoading(false);
                return;
            }

            await receiveTransfer(activeTransfer.id, payloadItems);
            toast({ title: "Received", description: "Stock added to inventory." });
            setReceiveOpen(false);
            setActiveTransfer(null);
        } catch (e: any) {
            toast({ title: "Error", description: "Failed to receive transfer.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Filter Transfers
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    const getOutletName = (id: string) => outlets.find(o => o.id === id)?.name || "Unknown";
    const getItemName = (id: string) => items.find(i => i.id === id)?.name || id;

    const filterTransfer = (t: Transfer) => {
        const matchesSearch =
            getOutletName(t.sourceOutletId).toLowerCase().includes(searchQuery.toLowerCase()) ||
            getOutletName(t.destinationOutletId).toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    };

    // Derived lists
    const incoming = transfers
        .filter(t => t.destinationOutletId === currentOutletId && t.status !== "COMPLETED")
        .filter(filterTransfer);

    const outgoing = transfers
        .filter(t => t.sourceOutletId === currentOutletId)
        .filter(filterTransfer);


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold flex items-center"><ArrowRightLeft className="mr-2 h-5 w-5" /> Stock Transfers</h3>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search Outlet, ID..."
                            className="h-8 w-[200px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>New Transfer</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>New Stock Transfer</DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Destination Outlet</Label>
                                    <Select value={targetOutlet} onValueChange={setTargetOutlet}>
                                        <SelectTrigger><SelectValue placeholder="Select Outlet" /></SelectTrigger>
                                        <SelectContent>
                                            {outlets.filter(o => o.id !== currentOutletId).map(o => (
                                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={transferType} onValueChange={(v: any) => setTransferType(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DISPATCH">Dispatch (Delivery)</SelectItem>
                                            <SelectItem value="PICKUP">Self Pickup</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Items</Label>
                                {selectedItems.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <Select
                                            value={item.itemId}
                                            onValueChange={v => {
                                                const newItems = [...selectedItems];
                                                newItems[idx].itemId = v;
                                                setSelectedItems(newItems);
                                            }}
                                        >
                                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Item" /></SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            className="w-24"
                                            placeholder="Qty"
                                            value={item.quantity}
                                            onChange={e => {
                                                const newItems = [...selectedItems];
                                                newItems[idx].quantity = Number(e.target.value);
                                                setSelectedItems(newItems);
                                            }}
                                        />
                                        {idx === selectedItems.length - 1 && (
                                            <Button variant="ghost" size="sm" onClick={handleAddItem}>+ Add</Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer..." />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleCreateTransfer} disabled={loading}>{loading ? "Processing..." : "Create Transfer"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Receiving Dialog */}
            <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Receive Transfer Items</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">Verify quantities received.</p>
                        {receiveItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-muted/40 p-2 rounded">
                                <span className="font-medium text-sm w-1/3 truncate">{getItemName(item.itemId)}</span>
                                <div className="flex gap-2 items-center">
                                    <span className="text-xs text-muted-foreground">Max: {item.maxQty}</span>
                                    <Input
                                        type="number"
                                        className="w-20 h-8"
                                        value={item.quantity}
                                        max={item.maxQty}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            // Ensure valid range? Allow over-delivery? Usually bind to max unless checked.
                                            // Let's iterate
                                            const newR = [...receiveItems];
                                            newR[idx].quantity = val;
                                            setReceiveItems(newR);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmitReceive} disabled={loading}>
                            {loading ? "Receiving..." : "Confirm Receipt"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Incoming Transfers */}
            {incoming.length > 0 && (
                <IncomingTransfersSection
                    transfers={incoming}
                    getOutletName={getOutletName}
                    getItemName={getItemName}
                    onReceive={openReceiveDialog}
                />
            )}

            {/* Outgoing History */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Transfer History</h4>
                <div className="border rounded-lg p-4 bg-muted/20">
                    {outgoing.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center">No outgoing transfers.</div>
                    ) : (
                        <div className="space-y-2">
                            {outgoing.map(t => (
                                <div key={t.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <span className="font-semibold">To {getOutletName(t.destinationOutletId)}</span>
                                        <span className="mx-2 text-muted-foreground">•</span>
                                        <span className={t.status === "COMPLETED" ? "text-green-600" : "text-yellow-600"}>{t.status}</span>
                                    </div>
                                    <div className="text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleDateString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
