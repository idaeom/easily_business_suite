"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserRole, deleteUser } from "@/actions/user-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, KeyRound } from "lucide-react";
import { PermissionsDialog } from "@/components/settings/PermissionsDialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface User {
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "CASHIER" | "USER";
    outletId: string | null;
    permissions?: string[] | null;
}

interface UsersTableProps {
    users: User[];
    outlets: { id: string; name: string }[];
}

export function UsersTable({ users, outlets }: UsersTableProps) {
    const { toast } = useToast();
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingId(userId);
        try {
            await updateUserRole(userId, newRole as any);
            toast({ title: "Role Updated", description: "User permission updated successfully." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (userId: string) => {
        try {
            await deleteUser(userId);
            toast({ title: "User Deleted", description: "User account removed." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    const getOutletName = (id: string | null) => {
        if (!id) return "-";
        return outlets.find(o => o.id === id)?.name || "Unknown";
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "ADMIN": return "bg-red-500 hover:bg-red-600";
            case "ACCOUNTANT": return "bg-blue-500 hover:bg-blue-600";
            case "MANAGER": return "bg-purple-500 hover:bg-purple-600";
            case "CASHIER": return "bg-green-500 hover:bg-green-600";
            default: return "bg-slate-500 hover:bg-slate-600";
        }
    };

    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handlePermissionsClick = (user: User) => {
        setSelectedUser(user);
        setPermissionsOpen(true);
    };

    const handlePermissionsSave = async (permissions: string[]) => {
        if (!selectedUser) return;
        try {
            await import("@/actions/user-actions").then(mod => mod.updateUserPermissions(selectedUser.id, permissions));
            toast({ title: "Permissions Updated", description: "User capabilities have been updated." });
            setPermissionsOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <div className="border rounded-md">
            <PermissionsDialog
                open={permissionsOpen}
                onOpenChange={setPermissionsOpen}
                currentPermissions={(selectedUser?.permissions || []) as string[]}
                onSave={handlePermissionsSave}
                userName={selectedUser?.name || "User"}
            />

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name || "No Name"}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <Select
                                    defaultValue={user.role}
                                    onValueChange={(val) => handleRoleChange(user.id, val)}
                                    disabled={updatingId === user.id}
                                >
                                    <SelectTrigger className="w-[140px] h-8">
                                        <div className="flex items-center gap-2">
                                            {updatingId === user.id && <Loader2 className="h-3 w-3 animate-spin" />}
                                            <Badge className={getRoleColor(updatingId === user.id ? "UPDATING" : user.role)} variant="secondary">
                                                {user.role}
                                            </Badge>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USER">User</SelectItem>
                                        <SelectItem value="CASHIER">Cashier</SelectItem>
                                        <SelectItem value="MANAGER">Manager</SelectItem>
                                        <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell>{getOutletName(user.outletId)}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handlePermissionsClick(user)}
                                        title="Edit Permissions"
                                    >
                                        <div className="h-4 w-4">🔑</div>
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete {user.name} ({user.email})? This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
