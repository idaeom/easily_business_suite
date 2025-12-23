
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { updateRequisitionStatus, getVendors, createVendor } from "@/actions/inventory";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

interface RequisitionDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requisition: any;
    onUpdate?: (updatedReq: any) => void;
    isAdmin?: boolean;
}

export function RequisitionDetailsDialog({ open, onOpenChange, requisition, onUpdate, isAdmin = false }: RequisitionDetailsDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Editable State
    const [items, setItems] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string>("");
    const [vendorOpen, setVendorOpen] = useState(false);

    // New Vendor State
    const [newVendorOpen, setNewVendorOpen] = useState(false);
    const [newVendorName, setNewVendorName] = useState("");

    useEffect(() => {
        if (requisition) {
            // Initialize items for editing
            setItems(requisition.items?.map((i: any) => ({
                ...i,
                quantity: Number(i.quantity),
                estimatedUnitPrice: Number(i.estimatedUnitPrice)
            })) || []);
            setSelectedVendorId(requisition.approvedVendorId || "");
        }
    }, [requisition]);

    useEffect(() => {
        if (open) {
            getVendors().then(setVendors);
        }
    }, [open]);

    if (!requisition) return null;

    const handleItemChange = (itemId: string, field: "quantity" | "estimatedUnitPrice", value: number) => {
        setItems(items.map(i => (i.id === itemId || i.itemId === itemId) ? { ...i, [field]: value } : i));
    };

    const handleCreateVendor = async () => {
        if (!newVendorName) return;
        try {
            const res = await createVendor({ name: newVendorName, bankName: "", accountNumber: "" }); // Minimal creation
            if (res.success && res.vendorId) {
                toast({ title: "Vendor Created" });
                setVendors([...vendors, { id: res.vendorId, name: newVendorName }]);
                setSelectedVendorId(res.vendorId);
                setNewVendorOpen(false);
                setNewVendorName("");
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to create vendor", variant: "destructive" });
        }
    };

    const handleStatus = async (status: "APPROVED_FOR_PAYMENT" | "CANCELLED") => {
        setLoading(true);
        try {
            if (status === "APPROVED_FOR_PAYMENT") {
                if (!selectedVendorId) {
                    toast({ title: "Vendor Required", description: "Please select a vendor before approving.", variant: "destructive" });
                    setLoading(false);
                    return;
                }

                // Prepare updated items payload
                const updatedItemsPayload = items.map(i => ({
                    itemId: i.itemId,
                    quantity: i.quantity,
                    price: i.estimatedUnitPrice
                }));

                await updateRequisitionStatus(requisition.id, status, selectedVendorId, updatedItemsPayload);
            } else {
                await updateRequisitionStatus(requisition.id, status);
            }

            toast({ title: "Status Updated", description: `Requisition marked as ${status}` });
            if (onUpdate) onUpdate({ ...requisition, status, items: items }); // Optimistic update of local data
            onOpenChange(false);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Only Admin or Approver should edit pricing.
    // Assuming isAdmin covers this.
    // If pending approval, user (requester) can maybe edit quantity? But price implies cost.
    // "its at the point of approval we should enter the unit price" -> Approver edits.

    // Logic:
    // If Pending:
    //   - Admin: Can edit Qty & Price.
    //   - User: Can view Qty. (Maybe edit if own request? Stick to user request: "at point of approval... edit").
    // So ONLY Approver (Admin) edits.

    const isEditable = requisition.status === "PENDING_APPROVAL" && isAdmin;
    const totalAmount = items.reduce((sum, i) => sum + (i.quantity * i.estimatedUnitPrice), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

                    {/* Vendor Selection (Only visible to Admin) */}
                    {(isAdmin && (isEditable || requisition.approvedVendorId)) && (
                        <div className="space-y-2">
                            <Label>Vendor</Label>
                            {isEditable ? (
                                <div className="flex gap-2">
                                    <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" aria-expanded={vendorOpen} className="w-[300px] justify-between">
                                                {selectedVendorId
                                                    ? vendors.find((v) => v.id === selectedVendorId)?.name
                                                    : "Select Vendor..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search vendor..." />
                                                <CommandList>
                                                    <CommandEmpty>No vendor found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {vendors.map((vendor) => (
                                                            <CommandItem
                                                                key={vendor.id}
                                                                value={vendor.name}
                                                                onSelect={() => {
                                                                    setSelectedVendorId(vendor.id === selectedVendorId ? "" : vendor.id);
                                                                    setVendorOpen(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", selectedVendorId === vendor.id ? "opacity-100" : "opacity-0")} />
                                                                {vendor.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>

                                    <Popover open={newVendorOpen} onOpenChange={setNewVendorOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Add New</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-4 space-y-4">
                                            <div className="space-y-2">
                                                <h4 className="font-medium leading-none">Add Vendor</h4>
                                                <p className="text-sm text-muted-foreground">Quick add vendor name.</p>
                                            </div>
                                            <div className="grid gap-2">
                                                <Input id="name" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Vendor Name" />
                                                <Button size="sm" onClick={handleCreateVendor}>Create</Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            ) : (
                                <div className="font-medium">{vendors.find(v => v.id === requisition.approvedVendorId)?.name || "Unknown Vendor"}</div>
                            )}
                        </div>
                    )}

                    {/* Items Table */}
                    <div>
                        <h4 className="font-semibold mb-2 text-sm">Requested Items</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right w-[150px]">Quantity</TableHead>
                                    {isAdmin && <TableHead className="text-right w-[150px]">Unit Price</TableHead>}
                                    {isAdmin && <TableHead className="text-right">Total</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id || item.itemId}>
                                        <TableCell>{item.item?.name || item.name || item.itemId}</TableCell>
                                        <TableCell className="text-right">
                                            {isEditable ? (
                                                <Input
                                                    type="number"
                                                    className="w-24 ml-auto text-right h-8"
                                                    value={item.quantity}
                                                    onChange={e => handleItemChange(item.id || item.itemId, "quantity", parseFloat(e.target.value))}
                                                />
                                            ) : Number(item.quantity)}
                                        </TableCell>

                                        {/* Only Admin sees Price and Total */}
                                        {isAdmin && (
                                            <>
                                                <TableCell className="text-right">
                                                    {isEditable ? (
                                                        <Input
                                                            type="number"
                                                            className="w-32 ml-auto text-right h-8"
                                                            value={item.estimatedUnitPrice}
                                                            onChange={e => handleItemChange(item.id || item.itemId, "estimatedUnitPrice", parseFloat(e.target.value))}
                                                        />
                                                    ) : `₦${Number(item.estimatedUnitPrice).toLocaleString()}`}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ₦{(item.quantity * item.estimatedUnitPrice).toLocaleString()}
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                                {isAdmin && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-bold">Total Amount</TableCell>
                                        <TableCell className="text-right font-bold">
                                            ₦{totalAmount.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter>
                    {isEditable ? (
                        <>
                            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleStatus("CANCELLED")} disabled={loading}>
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                            </Button>
                            <Button onClick={() => handleStatus("APPROVED_FOR_PAYMENT")} disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Approve & Save
                            </Button>
                        </>
                    ) : (
                        <div className="flex gap-2">
                            {/* Non-Admins just see a Close button, or if Admin viewing a non-pending one */}
                            {/* If Admin and Approved, maybe allow changing to Received? No, that's in GRN. */}
                            <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
