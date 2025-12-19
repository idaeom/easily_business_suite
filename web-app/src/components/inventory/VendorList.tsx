"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Building2, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVendor } from "@/actions/inventory";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
    id: string;
    name: string;
    bankName: string | null;
    accountNumber: string | null;
    contactPerson: string | null;
    phone: string | null;
}

export function VendorList({ vendors }: { vendors: Vendor[] }) {
    const [open, setOpen] = useState(false);
    const [newVendor, setNewVendor] = useState({ name: "", bankName: "", accountNumber: "", contactPerson: "", phone: "", email: "" });
    const { toast } = useToast();

    const handleCreate = async () => {
        if (!newVendor.name || !newVendor.bankName || !newVendor.accountNumber) {
            toast({ title: "Error", description: "Name and Bank Details are required", variant: "destructive" });
            return;
        }
        try {
            await createVendor(newVendor);
            toast({ title: "Success", description: "Vendor created successfully" });
            setOpen(false);
            setNewVendor({ name: "", bankName: "", accountNumber: "", contactPerson: "", phone: "", email: "" });
        } catch (e) {
            toast({ title: "Error", description: "Failed to create vendor", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Vendor Center</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                            <Plus className="mr-2 h-4 w-4" /> Add Vendor
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Vendor</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Company Name</Label>
                                <Input value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Contact Person</Label>
                                    <Input value={newVendor.contactPerson || ""} onChange={e => setNewVendor({ ...newVendor, contactPerson: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input value={newVendor.phone || ""} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-md space-y-4 border border-blue-100">
                                <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-800">
                                    <CreditCard size={14} /> Bank Details (Required)
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Bank Name</Label>
                                        <Input value={newVendor.bankName} onChange={e => setNewVendor({ ...newVendor, bankName: e.target.value })} placeholder="e.g. GTBank" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Account Number</Label>
                                        <Input value={newVendor.accountNumber} onChange={e => setNewVendor({ ...newVendor, accountNumber: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full" onClick={handleCreate}>Save Vendor</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendors.map(vendor => (
                    <div key={vendor.id} className="p-4 rounded-lg border bg-white flex justify-between items-start hover:shadow-sm transition-shadow">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-muted-foreground" />
                                <span className="font-semibold">{vendor.name}</span>
                            </div>
                            {vendor.contactPerson && <p className="text-xs text-muted-foreground ml-6">Contact: {vendor.contactPerson}</p>}
                            <div className="ml-6 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-1 rounded inline-block">
                                <CreditCard size={12} />
                                {vendor.bankName} - {vendor.accountNumber}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8">Details</Button>
                    </div>
                ))}
                {vendors.length === 0 && (
                    <div className="col-span-2 text-center p-8 text-muted-foreground border border-dashed rounded-md bg-slate-50">
                        No vendors found. Add one to start tracking payables.
                    </div>
                )}
            </div>
        </div>
    );
}
