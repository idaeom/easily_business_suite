
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateRequisitionStatus } from "@/actions/inventory";

interface RequisitionDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requisition: any;
    onUpdate?: (updatedReq: any) => void;
}

export function RequisitionDetailsDialog({ open, onOpenChange, requisition, onUpdate }: RequisitionDetailsDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    if (!requisition) return null;

    const handleStatus = async (status: "APPROVED_FOR_PAYMENT" | "CANCELLED") => {
        setLoading(true);
        try {
            await updateRequisitionStatus(requisition.id, status);
            toast({ title: "Status Updated", description: `Requisition marked as ${status}` });
            if (onUpdate) onUpdate({ ...requisition, status });
            onOpenChange(false);
        } catch (e) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        Requisition #{requisition.id.slice(0, 8)}
                        <Badge variant="outline">{requisition.status}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Requested by {requisition.requesterName} on {new Date(requisition.createdAt).toLocaleDateString()}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Description */}
                    <div className="p-4 bg-muted/20 rounded-md">
                        <h4 className="font-semibold mb-2 text-sm">Description / Reason</h4>
                        <p className="text-sm">{requisition.description || "No description provided."}</p>
                    </div>

                    {/* Items Table */}
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">Requested Items</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Est. Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requisition.items?.map((ri: any) => (
                                    <TableRow key={ri.id || ri.itemId}>
                                        <TableCell>{ri.item?.name || ri.itemId}</TableCell>
                                        <TableCell className="text-right">{Number(ri.quantity)}</TableCell>
                                        <TableCell className="text-right">₦{Number(ri.estimatedUnitPrice).toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₦{(Number(ri.quantity) * Number(ri.estimatedUnitPrice)).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Estimate</TableCell>
                                    <TableCell className="text-right font-bold">
                                        ₦{Number(requisition.totalEstimatedAmount).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter>
                    {requisition.status === "PENDING_APPROVAL" && (
                        <>
                            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleStatus("CANCELLED")} disabled={loading}>
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                            <Button onClick={() => handleStatus("APPROVED_FOR_PAYMENT")} disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Approve Request
                            </Button>
                        </>
                    )}
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
