"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface MyLeaveListProps {
    requests: any[];
}

export function MyLeaveList({ requests }: MyLeaveListProps) {
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    const filteredRequests = requests.filter(req => {
        return statusFilter === "ALL" || req.status === statusFilter;
    });

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Reset page on filter change
    if (page > totalPages && totalPages > 0) {
        setPage(1);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>My Leave History</CardTitle>
                <div className="w-[150px]">
                    <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                    No leave requests match your filter.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.type}</TableCell>
                                    <TableCell>
                                        {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        {Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === "APPROVED" ? "default" : req.status === "REJECTED" ? "destructive" : "outline"}>
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{req.reason}</TableCell>
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
