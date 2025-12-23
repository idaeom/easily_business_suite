"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createUser } from "@/actions/user-actions";
import { Loader2, Plus } from "lucide-react";

interface InviteUserDialogProps {
    outlets: { id: string; name: string }[];
}

export function InviteUserDialog({ outlets }: InviteUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("USER");
    const [outletId, setOutletId] = useState<string | undefined>(undefined);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createUser({ name, email, password, role, outletId });
            toast({ title: "User Created", description: `Successfully created user ${name}.` });
            setOpen(false);
            // Reset form
            setName("");
            setEmail("");
            setPassword("");
            setRole("USER");
            setOutletId(undefined);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                        Create a new account for an employee. They can change their password later.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" required />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">Password</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" required minLength={6} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Role</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USER">User (Standard)</SelectItem>
                                <SelectItem value="CASHIER">Cashier (POS)</SelectItem>
                                <SelectItem value="MANAGER">Manager (HR/Ops)</SelectItem>
                                <SelectItem value="ACCOUNTANT">Accountant (Finance)</SelectItem>
                                <SelectItem value="ADMIN">Admin (Full Access)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {(role === "CASHIER" || role === "MANAGER") && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="outlet" className="text-right">Branch</Label>
                            <Select value={outletId} onValueChange={setOutletId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {outlets.map((outlet) => (
                                        <SelectItem key={outlet.id} value={outlet.id}>
                                            {outlet.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </form>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create User
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
