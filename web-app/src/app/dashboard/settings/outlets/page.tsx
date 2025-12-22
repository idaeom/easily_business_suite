"use client";

import React, { useState, useEffect } from "react";
import { getOutlets, createOutlet, updateOutlet } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, MapPin, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Outlet {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    loyaltyEarningRate: string | null;
    loyaltyRedemptionRate: string | null;
    createdAt: Date;
}

export default function OutletsPage() {
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
    const { toast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        loyaltyEarningRate: "0.05",
        loyaltyRedemptionRate: "1.0"
    });

    const loadOutlets = async () => {
        setLoading(true);
        try {
            const data = await getOutlets();
            setOutlets(data as unknown as Outlet[]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load outlets", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOutlets();
    }, []);

    const handleOpen = (outlet?: Outlet) => {
        if (outlet) {
            setEditingOutlet(outlet);
            setFormData({
                name: outlet.name,
                address: outlet.address || "",
                phone: outlet.phone || "",
                loyaltyEarningRate: outlet.loyaltyEarningRate || "0.05",
                loyaltyRedemptionRate: outlet.loyaltyRedemptionRate || "1.0"
            });
        } else {
            setEditingOutlet(null);
            setFormData({
                name: "",
                address: "",
                phone: "",
                loyaltyEarningRate: "0.05",
                loyaltyRedemptionRate: "1.0"
            });
        }
        setIsOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingOutlet) {
                await updateOutlet(editingOutlet.id, formData);
                toast({ title: "Success", description: "Outlet updated successfully" });
            } else {
                await createOutlet(formData);
                toast({ title: "Success", description: "Outlet created successfully" });
            }
            setIsOpen(false);
            loadOutlets();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Operation failed", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Outlets</h2>
                    <p className="text-muted-foreground">Manage your store locations and branch settings.</p>
                </div>
                <Button onClick={() => handleOpen()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Outlet
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Locations</CardTitle>
                    <CardDescription>
                        List of all registered outlets in the system is below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Loyalty Earning</TableHead>
                                <TableHead>Loyalty Redemption</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading...
                                    </TableCell>
                                </TableRow>
                            ) : outlets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No outlets found. Create your first one!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                outlets.map((outlet) => (
                                    <TableRow key={outlet.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-muted-foreground" />
                                                {outlet.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                {outlet.address || "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell>{(Number(outlet.loyaltyEarningRate) * 100).toFixed(0)}%</TableCell>
                                        <TableCell>1 Pt = {outlet.loyaltyRedemptionRate}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpen(outlet)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingOutlet ? "Edit Outlet" : "Create Outlet"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Outlet Name</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Main Branch"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="123 Main St"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+1234567890"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="earning">Loyalty Earning (0-1)</Label>
                                <Input
                                    id="earning"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={formData.loyaltyEarningRate}
                                    onChange={(e) => setFormData({ ...formData, loyaltyEarningRate: e.target.value })}
                                    placeholder="0.05"
                                />
                                <p className="text-xs text-muted-foreground">Example: 0.05 for 5%</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="redemption">Redemption (Value per Point)</Label>
                                <Input
                                    id="redemption"
                                    type="number"
                                    step="0.01"
                                    value={formData.loyaltyRedemptionRate}
                                    onChange={(e) => setFormData({ ...formData, loyaltyRedemptionRate: e.target.value })}
                                    placeholder="1.0"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save Outlet</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
