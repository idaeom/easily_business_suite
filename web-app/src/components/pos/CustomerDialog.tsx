"use client";

import React, { useState, useEffect, useTransition } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Search, User } from "lucide-react";
import { createContact, getContacts } from "../../actions/crm"; // Relative import
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (customer: any) => void;
}

export default function CustomerDialog({ open, onOpenChange, onSelect }: CustomerDialogProps) {
    const { toast } = useToast();
    const [view, setView] = useState<"SEARCH" | "CREATE">("SEARCH");
    const [search, setSearch] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, startTransition] = useTransition();

    // Create Form State
    const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", address: "" });

    useEffect(() => {
        if (open && view === "SEARCH") {
            // Load initial customers or search
            loadCustomers();
        }
    }, [open, view, search]);

    const loadCustomers = () => {
        startTransition(async () => {
            // I'll assume getContacts is available or I will create it.
            try {
                const { getContacts } = await import("../../actions/crm");
                const res = await getContacts(search, "CUSTOMER");
                setCustomers(res);
            } catch (e) {
                console.error("Failed to load customers", e);
            }
        });
    };

    const handleCreate = async () => {
        if (!newCustomer.name) return;
        startTransition(async () => {
            try {
                const { createContact } = await import("../../actions/crm");
                const res = await createContact({ ...newCustomer, type: "CUSTOMER" });
                if (res.success) {
                    toast({ title: "Customer Created" });
                    onSelect(res.contact);
                    setView("SEARCH");
                    setNewCustomer({ name: "", email: "", phone: "", address: "" });
                }
            } catch (e: any) {
                toast({ title: "Error", description: e.message, variant: "destructive" });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{view === "SEARCH" ? "Select Customer" : "Create New Customer"}</DialogTitle>
                </DialogHeader>

                {view === "SEARCH" ? (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or phone..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button onClick={() => setView("CREATE")} variant="outline">
                                <UserPlus className="h-4 w-4 mr-2" /> New
                            </Button>
                        </div>

                        <ScrollArea className="h-[300px] border rounded-md p-2">
                            {customers.map(c => (
                                <div
                                    key={c.id}
                                    className="flex items-center justify-between p-3 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                                    onClick={() => onSelect(c)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {c.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{c.name}</div>
                                            <div className="text-xs text-muted-foreground">{c.phone || c.email}</div>
                                        </div>
                                    </div>
                                    {c.balance && Number(c.balance) !== 0 && (
                                        <div className={`text-xs font-bold ${Number(c.balance) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            Est Bal: {Number(c.balance)}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {customers.length === 0 && !isLoading && (
                                <div className="text-center py-8 text-muted-foreground text-sm">No customers found.</div>
                            )}
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Name</Label>
                                <Input className="col-span-3" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Phone</Label>
                                <Input className="col-span-3" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Email</Label>
                                <Input className="col-span-3" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Address</Label>
                                <Input className="col-span-3" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setView("SEARCH")}>Back</Button>
                            <Button onClick={handleCreate} disabled={!newCustomer.name || isLoading}>Create</Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
