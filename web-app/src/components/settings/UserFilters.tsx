"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export function UserFilters() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1'); // Reset pagination
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleRoleChange = (role: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        if (role && role !== "ALL") {
            params.set('role', role);
        } else {
            params.delete('role');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="w-full sm:w-[300px]">
                <Input
                    placeholder="Search users..."
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get('search')?.toString()}
                />
            </div>
            <div className="w-full sm:w-[200px]">
                <Select
                    onValueChange={handleRoleChange}
                    defaultValue={searchParams.get('role')?.toString() || "ALL"}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Roles</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                        <SelectItem value="CASHIER">Cashier</SelectItem>
                        <SelectItem value="USER">User</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
