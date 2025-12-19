"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Trash2, Edit2, CheckCircle, XCircle, FileCheck, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateQuoteStatus, convertQuoteToSale, updateQuoteDetails } from "@/actions/sales"; // We might need a generic updateQuote action for editing details
// Removed invalid import

interface QuoteDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quote: any;
    onUpdate?: (updatedQuote: any) => void;
}

export function QuoteDetailsDialog({ open, onOpenChange, quote, onUpdate }: QuoteDetailsDialogProps) {
    const { toast } = useToast();
    const [isConverting, setIsConverting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit State
    const [notes, setNotes] = useState("");
    const [discount, setDiscount] = useState(0);
    const [loyalty, setLoyalty] = useState(0);
    const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY");

    // Review State
    const [finalDiscount, setFinalDiscount] = useState(0);
    const [finalLoyalty, setFinalLoyalty] = useState(0);

    // Reset state when quote changes
    useEffect(() => {
        if (quote) {
            setNotes(quote.notes || "");
            setDiscount(quote.discountAmount || 0);
            setLoyalty(quote.loyaltyPointsUsed || 0);

            // Initialize Review State
            setFinalDiscount(Number(quote.discountAmount || 0));
            setFinalLoyalty(Number(quote.loyaltyPointsUsed || 0));

            setDeliveryMethod(quote.deliveryMethod || "DELIVERY");
            setIsEditing(false);
            setIsConverting(false); // Reset View
        }
    }, [quote]);

    if (!quote) return null;

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateQuoteDetails(quote.id, {
                notes,
                discountAmount: discount,
                loyaltyPointsUsed: loyalty,
                deliveryMethod
            });

            toast({ title: "Updated", description: "Quote details updated successfully." });
            setIsEditing(false);
            if (onUpdate) onUpdate({
                ...quote,
                notes,
                discountAmount: discount,
                loyaltyPointsUsed: loyalty,
                deliveryMethod
            });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update quote.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleStatus = async (status: "ACCEPTED" | "REJECTED" | "SENT") => {
        setLoading(true);
        try {
            await updateQuoteStatus(quote.id, status);
            toast({ title: "Status Updated", description: `Quote marked as ${status}` });
            if (onUpdate) onUpdate({ ...quote, status });
            onOpenChange(false);
        } catch (e) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleConvertClick = () => {
        setIsConverting(true);
    };

    const handleConfirmConvert = async () => {
        setLoading(true);
        try {
            const res = await convertQuoteToSale(quote.id, {
                discountAmount: finalDiscount,
                loyaltyPointsUsed: finalLoyalty
            });

            if (res.success) {
                toast({ title: "Success", description: "Quote converted to Sale!" });
                if (onUpdate) onUpdate({ ...quote, status: "CONVERTED" });
                onOpenChange(false);
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to convert quote.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                Quote #{quote.id.slice(0, 8)}
                                <Badge variant="outline">{quote.status}</Badge>
                            </DialogTitle>
                            <DialogDescription>
                                Created on {format(new Date(quote.quoteDate), "PPP")}
                            </DialogDescription>
                        </div>
                        {quote.status === "DRAFT" && !isEditing && !isConverting && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                {isConverting ? (
                    <div className="space-y-6 py-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
                            <h4 className="font-bold flex items-center gap-2">
                                <FileCheck className="w-4 h-4" /> Finalize Sale Details
                            </h4>
                            <p>Please review and adjust any final discounts or loyalty points before confirming the sale.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h5 className="font-semibold border-b pb-2">Customer Summary</h5>
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Name:</span>
                                        <span className="font-medium">{quote.customerName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Loyalty Balance:</span>
                                        <span className="font-medium text-green-600">
                                            {Number(quote.contact?.loyaltyPoints || 0).toLocaleString()} pts
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Contact:</span>
                                        <span>{quote.contact?.phone || "N/A"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 bg-slate-50 p-4 rounded-md border">
                                <h5 className="font-semibold border-b pb-2">Order Totals</h5>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal (Tax Inc)</span>
                                        <span>₦{Number(quote.subtotal).toLocaleString()}</span>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <Label>Discount Override (₦)</Label>
                                            <Input
                                                type="number"
                                                className="w-32 h-8 text-right bg-white"
                                                min="0"
                                                value={finalDiscount}
                                                onChange={(e) => setFinalDiscount(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <Label>Use Loyalty Points (1pt = ₦1)</Label>
                                            <Input
                                                type="number"
                                                className="w-32 h-8 text-right bg-white"
                                                min="0"
                                                max={Number(quote.contact?.loyaltyPoints || 0)}
                                                value={finalLoyalty}
                                                onChange={(e) => setFinalLoyalty(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <p className="text-[10px] text-right text-muted-foreground">
                                            Max available: {Number(quote.contact?.loyaltyPoints || 0)} pts
                                        </p>
                                    </div>

                                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                                        <span>Final Total</span>
                                        <span>
                                            ₦{Math.max(0, (Number(quote.subtotal) + Number(quote.tax || 0) - finalDiscount - finalLoyalty)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex justify-between">
                            <Button variant="ghost" onClick={() => setIsConverting(false)}>Back to Quote</Button>
                            <Button onClick={handleConfirmConvert} disabled={loading} className="w-full sm:w-auto">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2" />}
                                Confirm & Create Sale
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                            {/* Customer Info */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-sm border-b pb-2">Customer</h4>
                                <div className="text-sm">
                                    <p className="font-medium">{quote.customerName}</p>
                                    <p className="text-muted-foreground">{quote.contact?.phone || "No Phone"}</p>
                                    <p className="text-muted-foreground">{quote.contact?.email || "No Email"}</p>
                                    <div className="mt-2">
                                        <Label className="text-xs">Valid Until</Label>
                                        <p>{quote.validUntil ? format(new Date(quote.validUntil), "PPP") : "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="md:col-span-2 space-y-4">
                                <h4 className="font-semibold text-sm border-b pb-2">Items</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quote.items.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.itemName}</TableCell>
                                                <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                                                <TableCell className="text-right">₦{Number(item.unitPrice).toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-medium">₦{Number(item.total).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold">Subtotal</TableCell>
                                            <TableCell className="text-right font-bold">₦{Number(quote.subtotal).toLocaleString()}</TableCell>
                                        </TableRow>
                                        {/* Discount */}
                                        {Number(quote.discountAmount) > 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-right text-red-600">Discount</TableCell>
                                                <TableCell className="text-right text-red-600">-₦{Number(quote.discountAmount).toLocaleString()}</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                                            <TableCell className="text-right font-bold text-lg">
                                                ₦{(Number(quote.total) - Number(quote.discountAmount || 0)).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Editable Details (Notes, etc.) */}
                            <div className="md:col-span-3 space-y-4">
                                <h4 className="font-semibold text-sm border-b pb-2">Additional Details</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Discount Amount (₦)</Label>
                                        {isEditing ? (
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={discount}
                                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                            />
                                        ) : (
                                            <div className="p-2 bg-slate-50 rounded-md text-sm">
                                                ₦{Number(quote.discountAmount || 0).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Loyalty Points Used</Label>
                                        {isEditing ? (
                                            <Input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={loyalty}
                                                onChange={(e) => setLoyalty(parseFloat(e.target.value) || 0)}
                                            />
                                        ) : (
                                            <div className="p-2 bg-slate-50 rounded-md text-sm">
                                                {Number(quote.loyaltyPointsUsed || 0).toLocaleString()} pts
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Delivery Method</Label>
                                    {isEditing ? (
                                        <Select value={deliveryMethod} onValueChange={(val: "DELIVERY" | "PICKUP") => setDeliveryMethod(val)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DELIVERY">Delivery</SelectItem>
                                                <SelectItem value="PICKUP">Self Pick-up</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="p-2 bg-slate-50 rounded-md text-sm">
                                            {deliveryMethod === "PICKUP" ? "Self Pick-up" : "Delivery"}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Notes / Instructions</Label>
                                    {isEditing ? (
                                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                                    ) : (
                                        <div className="p-2 bg-slate-50 rounded-md text-sm min-h-[60px]">
                                            {quote.notes || "No notes provided."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex justify-between items-center sm:justify-between">
                            <div className="flex gap-2">
                                {/* Status Actions */}
                                {quote.status === "DRAFT" && (
                                    <Button variant="outline" onClick={() => handleStatus("SENT")} disabled={loading}>
                                        <Send className="w-4 h-4 mr-2" /> Mark Sent
                                    </Button>
                                )}
                                {quote.status !== "ACCEPTED" && quote.status !== "REJECTED" && quote.status !== "CONVERTED" && (
                                    <>
                                        <Button variant="outline" className="border-green-200 hover:bg-green-50 text-green-700" onClick={() => handleStatus("ACCEPTED")} disabled={loading}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Accept
                                        </Button>
                                        <Button variant="outline" className="border-red-200 hover:bg-red-50 text-red-700" onClick={() => handleStatus("REJECTED")} disabled={loading}>
                                            <XCircle className="w-4 h-4 mr-2" /> Reject
                                        </Button>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={loading}>Cancel</Button>
                                        <Button onClick={handleSave} disabled={loading}>
                                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {quote.status === "ACCEPTED" && (
                                            <Button onClick={handleConvertClick} disabled={loading}>
                                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2" />}
                                                Convert to Sale
                                            </Button>
                                        )}
                                        <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
                                    </>
                                )}
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
