"use client";

import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/actions/users";
import { useToast } from "@/hooks/use-toast";

interface UserRoleSelectProps {
    userId: string;
    currentRole: "ADMIN" | "USER";
    currentUserId: string; // To disable self-edit if needed
}

export function UserRoleSelect({ userId, currentRole, currentUserId }: UserRoleSelectProps) {
    const [role, setRole] = useState(currentRole);
    const [isLoading, setIsLoading] = useState(false);

    const { toast } = useToast();

    const handleRoleChange = async (newRole: "ADMIN" | "USER") => {
        setIsLoading(true);
        // Optimistic update
        setRole(newRole);

        try {
            await updateUserRole(userId, newRole);
            toast({ title: "Success", description: "User role updated successfully" });
        } catch (error: any) {
            // Revert on failure
            setRole(currentRole);
            toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // Disable if it's the current user (prevent self-lockout UI)
    const isDisabled = userId === currentUserId;

    return (
        <Select
            disabled={isDisabled || isLoading}
            value={role}
            onValueChange={handleRoleChange}
        >
            <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="USER">User</SelectItem>
            </SelectContent>
        </Select>
    );
}
