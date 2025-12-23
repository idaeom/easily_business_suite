
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { adjustStock } from "@/actions/inventory";
import { ClipboardPenLine } from "lucide-react";

interface Item {
    id: string;
    name: string;
    quantity: number;
}

export function StockAdjustmentDialog({ items, outletId }: { items: Partial<Item>[], outletId: string }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [itemId, setItemId] = useState("");
    const [quantityChange, setQuantityChange] = useState<number>(0);
    const [reason, setReason] = useState<string>("");
    const [notes, setNotes] = useState("");

    const handleAdjustment = async () => {
        if (!itemId || quantityChange === 0 || !reason) {
            toast({ title: "Validation Error", description: "Please fill all fields.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await adjustStock({
                itemId,
                outletId,
                quantityChange,
                reason: reason as any,
                notes
            });
            toast({ title: "Stock Adjusted", description: "Inventory Updated." });
            setOpen(false);
            // Reset
            setItemId("");
            setQuantityChange(0);
            setReason("");
            setNotes("");
        } catch (e) {
            toast({ title: "Error", description: "Failed to adjust stock.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><ClipboardPenLine className="h-4 w-4" /> Adjust Stock</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manual Stock Adjustment</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Item</Label>
                        <Select value={itemId} onValueChange={setItemId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Search Item..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {items.map(i => (
                                    <SelectItem key={i.id} value={i.id || ""}>{i.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Quantity Change (+/-)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. -5 for damage, 10 for found"
                            value={quantityChange}
                            onChange={e => setQuantityChange(parseFloat(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">Use negative values to reduce stock.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason Code</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DAMAGE">Damage</SelectItem>
                                <SelectItem value="THEFT">Theft</SelectItem>
                                <SelectItem value="EXPIRED">Expired</SelectItem>
                                <SelectItem value="CORRECTION">Correction</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            placeholder="Additional details..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdjustment} disabled={loading}>{loading ? "Saving..." : "Save Adjustment"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
