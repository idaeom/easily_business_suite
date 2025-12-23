"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { ApproveLeaveButton, RejectLeaveButton, CertifyLeaveButton } from "@/components/hr/LeaveActionButtons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaveApprovalListProps {
    requests: any[];
}

export function LeaveApprovalList({ requests }: LeaveApprovalListProps) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [typeFilter, setTypeFilter] = useState("ALL");
    const itemsPerPage = 5;

    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            (req.user?.name && req.user.name.toLowerCase().includes(search.toLowerCase())) ||
            (req.user?.email && req.user.email.toLowerCase().includes(search.toLowerCase()));

        const matchesType = typeFilter === "ALL" || req.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Get unique leave types for filter
    const leaveTypes = Array.from(new Set(requests.map(r => r.type)));

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle>Pending Approvals</CardTitle>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-[200px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search Employee..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                            <SelectTrigger className="w-[120px] h-9">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                {leaveTypes.map((type: any) => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                    No pending requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="font-medium">{req.user?.name}</div>
                                        <div className="text-xs text-muted-foreground">{req.user?.email}</div>
                                    </TableCell>
                                    <TableCell>{req.type}</TableCell>
                                    <TableCell>
                                        {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{req.reason}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" asChild>
                                            <a href={`/dashboard/hr/leaves/${req.id}`}>View</a>
                                        </Button>
                                        {req.status === "PENDING_CERTIFICATION" && (
                                            <CertifyLeaveButton requestId={req.id} />
                                        )}
                                        {req.status === "PENDING_APPROVAL" && (
                                            <ApproveLeaveButton requestId={req.id} />
                                        )}
                                        <RejectLeaveButton requestId={req.id} />
                                    </TableCell>
                                </TableRow>
                            ))
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
