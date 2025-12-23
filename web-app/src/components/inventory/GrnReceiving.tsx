
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Requisition {
    id: string;
    description: string;
    totalEstimatedAmount: string;
    status: string;
    requesterName: string;
    createdAt: Date;
    items?: any[];
}

import { ViewToggle } from "@/components/ui/view-toggle"; // Added import
import { format } from "date-fns"; // Added import
import { ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";

export default function GrnReceiving({ requests }: { requests: Requisition[] }) {
    const { toast } = useToast();
    // Filter only approved orders or partially received
    const pendingReceipt = requests.filter(r =>
        r.status === "APPROVED_FOR_PAYMENT" ||
        r.status === "DISBURSED" ||
        r.status === "PARTIALLY_RECEIVED"
    );

    const [view, setView] = useState<"grid" | "list">("grid");
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const itemsPerPage = 9;

    // Filter Logic
    const filteredRequests = pendingReceipt.filter(r => {
        const matchesSearch =
            (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (r.id.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedItems = filteredRequests.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Reset page logic
    React.useEffect(() => {
        setPage(1);
    }, [searchQuery, statusFilter]);

    React.useEffect(() => {
        if (page > totalPages && totalPages > 0) setPage(1);
    }, [filteredRequests.length, totalPages, page]);

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
                received: i.quantity, // Default to full remaining receipt
                // Ideally calculate remaining here if partial
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
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center"><PackageCheck className="mr-2" /> Goods Receiving (GRN)</h3>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                        <Input
                            placeholder="Search Supplier, PO..."
                            className="h-8 w-[200px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Active</SelectItem>
                                <SelectItem value="APPROVED_FOR_PAYMENT">Approved</SelectItem>
                                <SelectItem value="PARTIALLY_RECEIVED">Partially</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <span className="text-sm text-muted-foreground mr-2">{filteredRequests.length} Orders</span>
                    <ViewToggle view={view} onViewChange={setView} />
                </div>
            </div>

            {pendingReceipt.length === 0 && (
                <div className="text-muted-foreground text-sm italic">No pending orders to receive.</div>
            )}

            {view === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedItems.map(req => (
                        <Card key={req.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex justify-between">
                                    <span>{req.description}</span>
                                    <Badge variant={req.status === "PARTIALLY_RECEIVED" ? "secondary" : "outline"}>
                                        {req.status === "PARTIALLY_RECEIVED" ? "Partial" : "Approved"}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">PO #{req.id.slice(0, 8)}</p>
                                <p className="text-sm">Items: {req.items?.length || 0}</p>
                                <p className="font-bold mt-2">₦{parseFloat(req.totalEstimatedAmount).toLocaleString()}</p>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => openReceiveDialog(req)}>
                                    {req.status === "PARTIALLY_RECEIVED" ? "Receive More" : "Receive Goods"}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-md border text-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>PO Ref</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedItems.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>{format(new Date(req.createdAt), "MMM d, yyyy")}</TableCell>
                                    <TableCell className="font-mono text-xs">{req.id.slice(0, 8)}</TableCell>
                                    <TableCell className="font-medium">{req.description}</TableCell>
                                    <TableCell className="font-bold">₦{parseFloat(req.totalEstimatedAmount).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === "PARTIALLY_RECEIVED" ? "secondary" : "outline"}>
                                            {req.status === "PARTIALLY_RECEIVED" ? "Partial" : "Approved"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="secondary" onClick={() => openReceiveDialog(req)}>
                                            Receive
                                        </Button>
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
                                    <TableHead>Receiving Now</TableHead>
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
