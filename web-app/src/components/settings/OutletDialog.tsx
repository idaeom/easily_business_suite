
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createOutlet, updateOutlet } from "@/actions/settings";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface OutletDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    outlet?: any; // Outlet type
}

export function OutletDialog({ open, onOpenChange, outlet }: OutletDialogProps) {
    const isEdit = !!outlet;
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const [name, setName] = useState(outlet?.name || "");
    const [address, setAddress] = useState(outlet?.address || "");
    const [phone, setPhone] = useState(outlet?.phone || "");
    const [loyaltyEarningRate, setLoyaltyEarningRate] = useState(outlet?.loyaltyEarningRate || "0.05");
    const [loyaltyRedemptionRate, setLoyaltyRedemptionRate] = useState(outlet?.loyaltyRedemptionRate || "1.0");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                if (isEdit) {
                    await updateOutlet(outlet.id, {
                        name, address, phone, loyaltyEarningRate, loyaltyRedemptionRate
                    });
                    toast.success("Branch updated");
                } else {
                    await createOutlet({
                        name, address, phone, loyaltyEarningRate, loyaltyRedemptionRate
                    });
                    toast.success("Branch created");
                }
                router.refresh();
                onOpenChange(false);
            } catch (error) {
                toast.error("Failed to save branch");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Branch" : "Add New Branch"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Make changes to the branch details below." : "Enter the details for the new branch."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="address" className="text-right">Address</Label>
                            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">Phone</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="earn" className="text-right">Loyalty Income</Label>
                            <Input id="earn" type="number" step="0.01" value={loyaltyEarningRate} onChange={(e) => setLoyaltyEarningRate(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="redeem" className="text-right">Redeem Cost</Label>
                            <Input id="redeem" type="number" step="0.01" value={loyaltyRedemptionRate} onChange={(e) => setLoyaltyRedemptionRate(e.target.value)} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
