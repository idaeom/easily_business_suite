
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveSalesTax, deleteSalesTax } from "@/actions/pos-settings";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface TaxRule {
    id: string;
    name: string;
    rate: string; // Decimal from DB is string
    type: "INCLUSIVE" | "EXCLUSIVE";
    isEnabled: boolean | null; // DB might return null but schema default true
}

export function TaxRulesList({ initialData }: { initialData: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState<TaxRule | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: "",
        rate: "0",
        type: "EXCLUSIVE" as "INCLUSIVE" | "EXCLUSIVE",
        isEnabled: true
    });

    const handleOpen = (item?: any) => {
        if (item) {
            setEditing(item);
            setFormData({
                name: item.name,
                rate: item.rate,
                type: item.type,
                isEnabled: item.isEnabled ?? true
            });
        } else {
            setEditing(null);
            setFormData({ name: "", rate: "0", type: "EXCLUSIVE", isEnabled: true });
        }
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await saveSalesTax({
                id: editing?.id,
                name: formData.name,
                rate: parseFloat(formData.rate),
                type: formData.type,
                isEnabled: formData.isEnabled
            });
            toast.success(editing ? "Tax updated" : "Tax created");
            setIsOpen(false);
            router.refresh();
        } catch (e) {
            toast.error("Failed to save tax");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await deleteSalesTax(id);
            toast.success("Tax deleted");
            router.refresh();
        } catch (e) {
            toast.error("Failed to delete tax");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Sales Taxes</h2>
                <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" /> Add Tax</Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Rate (%)</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.map((rule) => (
                            <TableRow key={rule.id}>
                                <TableCell>{rule.name}</TableCell>
                                <TableCell>{Number(rule.rate)}%</TableCell>
                                <TableCell>{rule.type}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${rule.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {rule.isEnabled ? "Active" : "Disabled"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpen(rule)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(rule.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {initialData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                    No tax rules defined.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Tax Rule" : "New Tax Rule"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. VAT"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Rate (%)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.rate}
                                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXCLUSIVE">Exclusive (Added to price)</SelectItem>
                                    <SelectItem value="INCLUSIVE">Inclusive (Included in price)</SelectItem>
                                </SelectContent>
                            </Select>
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
