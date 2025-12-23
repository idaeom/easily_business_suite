"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, Loader2, CalendarIcon } from "lucide-react";
import { useDebounce } from "use-debounce";
import { searchCustomers, searchItems, createQuote, createQuickCustomer } from "@/actions/sales";
import { Contact } from "@/db/schema"; // Type
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useRouter } from "next/navigation";

export function CreateQuoteDialog({
    children,
    initialCustomer
}: {
    children: React.ReactNode;
    initialCustomer?: { id: string; name: string; phone?: string | null };
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(initialCustomer ? 2 : 1);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [validUntil, setValidUntil] = useState<Date | undefined>();

    // Customer State
    const [customerQuery, setCustomerQuery] = useState("");
    const [debouncedCustomerQuery] = useDebounce(customerQuery, 300);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(initialCustomer || null);
    const [newCustomerPhone, setNewCustomerPhone] = useState("");

    // Items State
    const [items, setItems] = useState<{ itemId: string; itemName: string; quantity: number; unitPrice: number }[]>([]);
    const [itemQuery, setItemQuery] = useState("");
    const [debouncedItemQuery] = useDebounce(itemQuery, 300);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY");

    // Effects for Search
    useEffect(() => {
        if (debouncedCustomerQuery.length < 2) {
            setCustomers([]);
            return;
        }
        startTransition(async () => {
            const res = await searchCustomers(debouncedCustomerQuery);
            setCustomers(res);
        });
    }, [debouncedCustomerQuery]);

    useEffect(() => {
        if (debouncedItemQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        startTransition(async () => {
            const res = await searchItems(debouncedItemQuery);
            setSearchResults(res);
        });
    }, [debouncedItemQuery]);


    const handleCreateQuickCustomer = async () => {
        if (!customerQuery || !newCustomerPhone) return;
        startTransition(async () => {
            const res = await createQuickCustomer({ name: customerQuery, phone: newCustomerPhone });
            if (res.success) {
                setSelectedCustomer(res.contact);
                setStep(2);
                toast({ title: "Customer Selected", description: `Drafting quote for ${res.contact.name}` });
            }
        });
    };

    const handleAddItem = (item: any) => {
        setItems([...items, { itemId: item.id, itemName: item.name, quantity: 1, unitPrice: Number(item.price) }]);
        setItemQuery("");
        setSearchResults([]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleUpdateQuantity = (index: number, val: number) => {
        const newItems = [...items];
        newItems[index].quantity = val;
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!selectedCustomer) return;
        startTransition(async () => {
            try {
                await createQuote({
                    contactId: selectedCustomer.id,
                    customerName: selectedCustomer.name,
                    items: items,
                    validUntil: validUntil,
                    deliveryMethod: deliveryMethod
                });
                toast({ title: "Success", description: "Quote created successfully." });
                router.refresh();
                setOpen(false);
                // Reset State
                setSelectedCustomer(initialCustomer || null);
                setItems([]);
                setValidUntil(undefined);
                setDeliveryMethod("DELIVERY");
                setStep(initialCustomer ? 2 : 1);
            } catch (e) {
                toast({ title: "Error", description: "Failed to create quote.", variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Create New Quote</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* CUSTOMER STEP */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Select Customer</Label>
                                <Input
                                    placeholder="Search by Name or Phone..."
                                    value={customerQuery}
                                    onChange={(e) => setCustomerQuery(e.target.value)}
                                />
                                {customers.length > 0 && (
                                    <div className="border rounded-md p-2 bg-slate-50 max-h-40 overflow-y-auto">
                                        {customers.map(c => (
                                            <div
                                                key={c.id}
                                                className="p-2 hover:bg-white cursor-pointer rounded flex justify-between"
                                                onClick={() => { setSelectedCustomer(c); setStep(2); }}
                                            >
                                                <span className="font-medium">{c.name}</span>
                                                <span className="text-muted-foreground text-sm">{c.phone}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {debouncedCustomerQuery.length > 2 && customers.length === 0 && !isPending && (
                                    <div className="p-4 border border-dashed rounded-md bg-slate-50 text-center">
                                        <p className="text-sm text-muted-foreground mb-2">No customer found. Create new?</p>
                                        <div className="flex gap-2 max-w-sm mx-auto">
                                            <Input
                                                placeholder="Enter Phone Number"
                                                value={newCustomerPhone}
                                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                                            />
                                            <Button onClick={handleCreateQuickCustomer} disabled={!newCustomerPhone}>
                                                Create
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ITEMS STEP */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-100 p-2 rounded">
                                <div>
                                    <p className="font-bold">{selectedCustomer?.name}</p>
                                    <p className="text-xs text-muted-foreground">Customer</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setStep(1)}>Change</Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Delivery Method</Label>
                                <Select value={deliveryMethod} onValueChange={(val: "DELIVERY" | "PICKUP") => setDeliveryMethod(val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DELIVERY">Delivery</SelectItem>
                                        <SelectItem value="PICKUP">Self Pick-up</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Projected Sale Items</Label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search products..."
                                        className="pl-8"
                                        value={itemQuery}
                                        onChange={(e) => setItemQuery(e.target.value)}
                                    />
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                        {searchResults.map(item => (
                                            <div
                                                key={item.id}
                                                className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                                onClick={() => handleAddItem(item)}
                                            >
                                                <div className="flex flex-col">
                                                    <span>{item.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {item.itemType === 'SERVICE'
                                                            ? 'Service'
                                                            : `${Number(item.quantity).toFixed(2)} in stock`}
                                                    </span>
                                                </div>
                                                <span className="font-mono">₦{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ITEM LIST */}
                            <div className="border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="p-2 text-left">Item</th>
                                            <th className="p-2 w-24">Qty</th>
                                            <th className="p-2 w-32 text-right">Price</th>
                                            <th className="p-2 w-32 text-right">Total</th>
                                            <th className="p-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                                    No items added yet.
                                                </td>
                                            </tr>
                                        )}
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="border-b last:border-0">
                                                <td className="p-2">{item.itemName}</td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value))}
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-2 text-right">₦{item.unitPrice.toLocaleString()}</td>
                                                <td className="p-2 text-right">₦{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                                <td className="p-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveItem(idx)}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-medium">
                                        <tr>
                                            <td colSpan={3} className="p-2 text-right">Total:</td>
                                            <td className="p-2 text-right">
                                                ₦{items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toLocaleString()}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex items-center gap-4 pt-4 border-t">
                                <div className="flex flex-col space-y-2">
                                    <Label>Valid Until</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[200px] justify-start text-left font-normal",
                                                    !validUntil && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {validUntil ? format(validUntil, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={validUntil}
                                                onSelect={setValidUntil}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={items.length === 0 || isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Quote
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}


