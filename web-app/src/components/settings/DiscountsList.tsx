
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveDiscount, deleteDiscount } from "@/actions/pos-settings";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface Discount {
    id: string;
    name: string;
    type: "PERCENTAGE" | "FIXED";
    value: string;
    isEnabled: boolean | null;
}

export function DiscountsList({ initialData }: { initialData: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState<Discount | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: "",
        type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
        value: "0",
        isEnabled: true
    });

    const handleOpen = (item?: any) => {
        if (item) {
            setEditing(item);
            setFormData({
                name: item.name,
                type: item.type,
                value: item.value,
                isEnabled: item.isEnabled ?? true
            });
        } else {
            setEditing(null);
            setFormData({ name: "", type: "PERCENTAGE", value: "0", isEnabled: true });
        }
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await saveDiscount({
                id: editing?.id,
                name: formData.name,
                type: formData.type,
                value: parseFloat(formData.value),
                isEnabled: formData.isEnabled
            });
            toast.success(editing ? "Discount updated" : "Discount created");
            setIsOpen(false);
            router.refresh();
        } catch (e) {
            toast.error("Failed to save discount");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await deleteDiscount(id);
            toast.success("Discount deleted");
            router.refresh();
        } catch (e) {
            toast.error("Failed to delete discount");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Discounts</h2>
                <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" /> Add Discount</Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.type}</TableCell>
                                <TableCell>
                                    {item.type === "PERCENTAGE" ? `${Number(item.value)}%` : Number(item.value).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${item.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {item.isEnabled ? "Active" : "Disabled"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpen(item)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {initialData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                    No discounts defined.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Discount" : "New Discount"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Summer Sale"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Value</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                            <Switch
                                checked={formData.isEnabled}
                                onCheckedChange={(c) => setFormData({ ...formData, isEnabled: c })}
                            />
                            <Label>Enabled</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
