"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { logDispatchDelivery } from "@/actions/operations";
import { Badge } from "@/components/ui/badge";

interface DeliveryItem {
    itemId: string;
    itemName: string;
    quantityDispatched: number; // Meaning "Remaining to verify" contextually
    quantityDelivered: number;
    quantityReturned: number;
    condition: string;
    comments: string;
}

interface CompleteDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dispatch: any;
    onSuccess: () => void;
}

export function CompleteDeliveryDialog({ open, onOpenChange, dispatch, onSuccess }: CompleteDeliveryDialogProps) {
    const { toast } = useToast();
    const [items, setItems] = useState<DeliveryItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (dispatch?.sale?.items) {
            const history = dispatch.items || [];

            const calculatedItems = dispatch.sale.items.map((saleItem: any) => {
                const totalOrdered = Number(saleItem.quantity);
                const deliveredSoFar = history
                    .filter((h: any) => h.itemId === saleItem.itemId)
                    .reduce((sum: number, h: any) => sum + Number(h.quantityDelivered), 0);

                const remaining = totalOrdered - deliveredSoFar;

                return {
                    itemId: saleItem.itemId,
                    itemName: saleItem.itemName,
                    quantityDispatched: Math.max(0, remaining),
                    quantityDelivered: Math.max(0, remaining),
                    quantityReturned: 0,
                    condition: "GOOD",
                    comments: ""
                };
            });
            setItems(calculatedItems);
        }
    }, [dispatch]);

    const updateItem = (index: number, field: keyof DeliveryItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleConfirm = async (isFinal: boolean) => {
        setIsSubmitting(true);
        try {
            const itemsToLog = items.filter(i => i.quantityDelivered > 0 || i.quantityReturned > 0);

            if (itemsToLog.length === 0 && !isFinal) {
                toast({ title: "No changes", description: "Please enter delivered quantities." });
                setIsSubmitting(false);
                return;
            }

            await logDispatchDelivery({
                dispatchId: dispatch.id,
                items: itemsToLog.map(i => ({
                    itemId: i.itemId,
                    quantityDispatched: i.quantityDispatched,
                    quantityDelivered: i.quantityDelivered,
                    quantityReturned: i.quantityReturned,
                    condition: i.condition,
                    comments: i.comments
                })),
                isFinal
            });
            toast({
                title: isFinal ? "Delivery Completed" : "Progress Logged",
                description: isFinal ? "Dispatch marked as DELIVERED." : "Delivery entry recorded."
            });
            onSuccess();
            if (isFinal) onOpenChange(false);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to update delivery", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!dispatch) return null;

    const history = dispatch.items || [];
    const isPending = dispatch.status === 'PENDING';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle>Confirm Delivery</DialogTitle>
                            <DialogDescription>
                                Dispatch #{dispatch.id.slice(0, 8)} - {dispatch.contact?.name}
                            </DialogDescription>
                        </div>
                        <Badge variant="outline">{dispatch.status}</Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* History Section */}
                    {history.length > 0 && (
                        <div className="bg-muted/20 p-4 rounded-md">
                            <h4 className="font-semibold mb-2 text-sm text-gray-500">Delivery History</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Delivered</TableHead>
                                        <TableHead>Condition</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((h: any) => (
                                        <TableRow key={h.id}>
                                            <TableCell className="text-xs">{new Date().toLocaleDateString()}</TableCell>
                                            <TableCell className="text-xs">
                                                {dispatch.sale?.items?.find((i: any) => i.itemId === h.itemId)?.itemName || "Item"}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">{h.quantityDelivered}</TableCell>
                                            <TableCell className="text-xs">{h.condition}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Current Entry Section */}
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">New Entry</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%]">Item</TableHead>
                                    <TableHead className="w-[15%]">Remaining</TableHead>
                                    <TableHead className="w-[15%]">Delivered Now</TableHead>
                                    <TableHead className="w-[15%]">Returned</TableHead>
                                    <TableHead className="w-[25%]">Condition</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, idx) => (
                                    <TableRow key={item.itemId} className={item.quantityDispatched === 0 ? "opacity-50" : ""}>
                                        <TableCell className="font-medium">
                                            {item.itemName}
                                            {item.quantityDispatched === 0 && <span className="ml-2 text-green-600 text-xs">(Complete)</span>}
                                        </TableCell>
                                        <TableCell>{item.quantityDispatched}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="w-20"
                                                value={item.quantityDelivered}
                                                onChange={(e) => updateItem(idx, 'quantityDelivered', Number(e.target.value))}
                                                max={item.quantityDispatched}
                                                min={0}
                                                disabled={item.quantityDispatched === 0 || isPending}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="w-20"
                                                value={item.quantityReturned}
                                                onChange={(e) => updateItem(idx, 'quantityReturned', Number(e.target.value))}
                                                min={0}
                                                disabled={item.quantityDispatched === 0 || isPending}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={item.condition}
                                                onValueChange={(val) => updateItem(idx, 'condition', val)}
                                                disabled={item.quantityDispatched === 0 || isPending}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GOOD">Good</SelectItem>
                                                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                                                    <SelectItem value="MISSING">Missing</SelectItem>
                                                    <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="mr-auto">Close</Button>

                    {!isPending && (
                        <>
                            <Button variant="secondary" onClick={() => handleConfirm(false)} disabled={isSubmitting}>
                                Log Partial Delivery
                            </Button>
                            <Button onClick={() => handleConfirm(true)} disabled={isSubmitting} variant="default">
                                Complete & Close
                            </Button>
                        </>
                    )}
                    {isPending && (
                        <div className="text-sm text-amber-600 italic flex items-center bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
                            Dispatch must be assigned to a Haulage Provider before logging delivery.
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
