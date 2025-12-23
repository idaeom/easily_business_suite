"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EmployeeListProps {
    employees: any[];
}

export function EmployeeList({ employees }: EmployeeListProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const filteredEmployees = employees.filter(user => {
        const profile = user.employeeProfile;
        const matchesSearch =
            (user.name && user.name.toLowerCase().includes(search.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(search.toLowerCase())) ||
            (profile?.jobTitle && profile.jobTitle.toLowerCase().includes(search.toLowerCase()));

        const hasProfile = !!profile;
        const matchesStatus =
            statusFilter === "ALL" ? true :
                statusFilter === "ACTIVE" ? hasProfile :
                    statusFilter === "INCOMPLETE" ? !hasProfile : true;

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const paginatedEmployees = filteredEmployees.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle>Staff Directory</CardTitle>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-[200px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search Name, Email..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] h-9">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Staff</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INCOMPLETE">No Profile</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Job Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedEmployees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No employees found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedEmployees.map((user) => {
                                const profile = user.employeeProfile;
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{profile?.jobTitle || "-"}</TableCell>
                                        <TableCell>
                                            {profile?.employmentType ? (
                                                <Badge variant="outline">{profile.employmentType}</Badge>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {profile ? (
                                                <Badge className="bg-green-500">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">No Profile</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/hr/employees/${user.id}`}>
                                                <Button size="sm" variant="ghost">
                                                    {profile ? "Edit" : "Setup"}
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm font-medium">Page {page} of {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
