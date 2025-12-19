
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { createHaulageProvider, updateHaulageProvider } from "@/actions/operations";
import { Users, Truck, Plus, Pencil, Save, X } from "lucide-react";

interface HaulageProvider {
    id: string;
    providerName: string;
    contactPerson: string | null;
    phone: string | null;
    vehicleType: string | null;
    status: string | null;
}

export function HaulageManagerDialog({ providers }: { providers: HaulageProvider[] }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        providerName: "",
        contactPerson: "",
        phone: "",
        vehicleType: "Truck",
        status: "ACTIVE"
    });

    const resetForm = () => {
        setFormData({
            providerName: "",
            contactPerson: "",
            phone: "",
            vehicleType: "Truck",
            status: "ACTIVE"
        });
        setIsEditing(null);
        setIsCreating(false);
    };

    const handleEdit = (provider: HaulageProvider) => {
        setFormData({
            providerName: provider.providerName,
            contactPerson: provider.contactPerson || "",
            phone: provider.phone || "",
            vehicleType: provider.vehicleType || "Truck",
            status: provider.status || "ACTIVE"
        });
        setIsEditing(provider.id);
        setIsCreating(false);
    };

    const handleSave = async () => {
        if (!formData.providerName) return;

        try {
            if (isEditing) {
                await updateHaulageProvider(isEditing, formData);
                toast({ title: "Updated", description: "Provider updated successfully" });
            } else {
                await createHaulageProvider(formData);
                toast({ title: "Created", description: "Provider added successfully" });
            }
            resetForm();
            // Don't close dialog, user might want to do more or see list
        } catch (e) {
            toast({ title: "Error", description: "Failed to save provider", variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Truck className="h-4 w-4" />
                    Manage Providers
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Haulage Providers</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Toolbar */}
                    {!isCreating && !isEditing && (
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => setIsCreating(true)} className="gap-2">
                                <Plus className="h-4 w-4" /> Add Provider
                            </Button>
                        </div>
                    )}

                    {/* Form */}
                    {(isCreating || isEditing) && (
                        <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                            <h3 className="font-semibold text-sm">
                                {isEditing ? "Edit Provider" : "New Provider"}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Provider Name</Label>
                                    <Input
                                        value={formData.providerName}
                                        onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contact Person</Label>
                                    <Input
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                        placeholder="Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="Phone Number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vehicle Type (Default)</Label>
                                    <Input
                                        value={formData.vehicleType}
                                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                        placeholder="Truck, Van, Bike"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                                <Button size="sm" onClick={handleSave} disabled={!formData.providerName}>
                                    <Save className="h-4 w-4 mr-2" /> Save
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {providers.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.providerName}</TableCell>
                                        <TableCell>{p.contactPerson}</TableCell>
                                        <TableCell>{p.phone}</TableCell>
                                        <TableCell>{p.vehicleType}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                                                <Pencil className="h-4 w-4 text-slate-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {providers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                            No providers found. Add one to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
