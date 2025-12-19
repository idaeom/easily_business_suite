
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createGrn } from "@/actions/inventory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PackageCheck } from "lucide-react";

interface Requisition {
    id: string;
    description: string;
    totalEstimatedAmount: string;
    status: string;
    requesterName: string;
    createdAt: Date;
    items?: any[];
}

export default function GrnReceiving({ requests }: { requests: Requisition[] }) {
    const { toast } = useToast();
    // Filter only those ready to receive
    const pendingReceipt = requests.filter(r => r.status === "APPROVED_FOR_PAYMENT" || r.status === "DISBURSED");

    const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
    const [receiveData, setReceiveData] = useState<{ itemId: string; name: string; ordered: number; received: number; condition: string }[]>([]);
    const [vendorInvoice, setVendorInvoice] = useState("");

    const openReceiveDialog = (req: Requisition) => {
        setSelectedReq(req);
        // Pre-fill with ordered quantities
        if (req.items) {
            setReceiveData(req.items.map((i: any) => ({
                itemId: i.itemId,
                name: i.item?.name || "Unknown Item",
                ordered: i.quantity,
                received: i.quantity, // Default to full receipt
                condition: "GOOD"
            })));
        }
    };

    const handleReceive = async () => {
        if (!selectedReq) return;

        try {
            await createGrn({
                requestOrderId: selectedReq.id,
                vendorInvoiceNumber: vendorInvoice,
                items: receiveData.map(d => ({
                    itemId: d.itemId,
                    quantityReceived: d.received,
                    condition: d.condition
                }))
            });
            toast({ title: "GRN Created", description: "Stock updated successfully." });
            setSelectedReq(null);
            setVendorInvoice("");
        } catch (e) {
            toast({ title: "Error", description: "Failed to process GRN.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold flex items-center"><PackageCheck className="mr-2" /> Goods Receiving (GRN)</h3>

            {pendingReceipt.length === 0 && (
                <div className="text-muted-foreground text-sm italic">No pending orders to receive.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingReceipt.map(req => (
                    <Card key={req.id}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex justify-between">
                                <span>{req.description}</span>
                                <Badge variant="outline">{req.status}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">PO #{req.id.slice(0, 8)}</p>
                            <p className="text-sm">Items: {req.items?.length || 0}</p>
                            <p className="font-bold mt-2">${parseFloat(req.totalEstimatedAmount).toLocaleString()}</p>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => openReceiveDialog(req)}>Receive Goods</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Dialog open={!!selectedReq} onOpenChange={(open) => !open && setSelectedReq(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Receive Items for PO #{selectedReq?.id.slice(0, 8)}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Vendor Invoice #</Label>
                            <Input value={vendorInvoice} onChange={e => setVendorInvoice(e.target.value)} placeholder="Enter invoice number" />
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Ordered</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead>Condition</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receiveData.map((row, idx) => (
                                    <TableRow key={row.itemId}>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>{row.ordered}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="w-20"
                                                value={row.received}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newData = [...receiveData];
                                                    newData[idx].received = val;
                                                    setReceiveData(newData);
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="w-32"
                                                value={row.condition}
                                                onChange={e => {
                                                    const newData = [...receiveData];
                                                    newData[idx].condition = e.target.value;
                                                    setReceiveData(newData);
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedReq(null)}>Cancel</Button>
                        <Button onClick={handleReceive}>Confirm Receipt</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
