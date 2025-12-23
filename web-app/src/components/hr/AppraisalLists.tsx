"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link"; // Ensure Link is imported

interface AppraisalListProps {
    appraisals: any[];
}

export function AppraisalApprovalList({ appraisals }: AppraisalListProps) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    const filtered = appraisals.filter(app =>
        (app.user?.name && app.user.name.toLowerCase().includes(search.toLowerCase())) ||
        (app.user?.email && app.user.email.toLowerCase().includes(search.toLowerCase()))
    );

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Pending Approvals/Certifications</CardTitle>
                    <div className="relative w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search Employee..."
                            className="pl-9 h-9"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    No pending appraisals.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((app) => (
                                <TableRow key={app.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={app.user?.image} />
                                                <AvatarFallback>{app.user?.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{app.user?.name}</div>
                                                <div className="text-xs text-muted-foreground">{app.user?.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{app.period}</TableCell>
                                    <TableCell>
                                        <span className="font-bold">{app.score}</span>
                                        {app.objectiveScore && <span className="text-xs text-muted-foreground ml-1">({app.objectiveScore})</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{app.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/dashboard/hr/appraisals/${app.id}`}>
                                            <Button size="sm" variant="outline">View</Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 pt-4">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-sm">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function MyAppraisalList({ appraisals }: AppraisalListProps) {
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(appraisals.length / itemsPerPage);
    const paginated = appraisals.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Performance History</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Reviewer</TableHead>
                            <TableHead>Feedback</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    No appraisals found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((app) => (
                                <TableRow key={app.id}>
                                    <TableCell className="font-medium">{app.period}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold">{app.score}</span>
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        </div>
                                        {app.objectiveScore && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Obj: {app.objectiveScore}/10
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>{app.reviewer?.name || "Unknown"}</TableCell>
                                    <TableCell className="max-w-[400px]">
                                        {app.hrComment ? (
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Draft Report</div>
                                                <div className="text-sm border-l-2 border-indigo-200 pl-2 whitespace-pre-wrap max-h-[100px] overflow-hidden truncate">
                                                    {app.hrComment}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground truncate">{app.comments}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>{format(new Date(app.createdAt), "MMM d, yyyy")}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 pt-4">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-sm">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function TeamAppraisalList({ appraisals }: AppraisalListProps) {
    const [search, setSearch] = useState("");
    const [periodFilter, setPeriodFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    const filtered = appraisals.filter(app => {
        const matchesSearch = (app.user?.name && app.user.name.toLowerCase().includes(search.toLowerCase())) ||
            (app.user?.email && app.user.email.toLowerCase().includes(search.toLowerCase()));

        const matchesPeriod = periodFilter === "ALL" || app.period === periodFilter;
        const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;

        return matchesSearch && matchesPeriod && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const periods = Array.from(new Set(appraisals.map(a => a.period)));
    const statuses = Array.from(new Set(appraisals.map(a => a.status)));

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <CardTitle>Team Performance Reviews</CardTitle>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-[200px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search Employee..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <Select value={periodFilter} onValueChange={(val) => { setPeriodFilter(val); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[130px] h-9">
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Periods</SelectItem>
                                {periods.map((p: any) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[130px] h-9">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                {statuses.map((s: any) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
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
                            <TableHead>Period</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reviewer</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No appraisals match your filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((app) => (
                                <TableRow key={app.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={app.user?.image} />
                                                <AvatarFallback>{app.user?.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{app.user?.name}</div>
                                                <div className="text-xs text-muted-foreground">{app.user?.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{app.period}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold">{app.score}</span>
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={app.status === "APPROVED" ? "default" : app.status === "REJECTED" ? "destructive" : "outline"}>
                                            {app.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{app.reviewer?.name}</TableCell>
                                    <TableCell>{format(new Date(app.createdAt), "MMM d, yyyy")}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 pt-4">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-sm">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
