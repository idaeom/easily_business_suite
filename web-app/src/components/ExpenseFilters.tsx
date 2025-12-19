"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { Search, Filter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ExpenseFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [status, setStatus] = useState(searchParams.get("status") || "ALL");
    const [startDate, setStartDate] = useState<Date | undefined>(
        searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
    );
    const [endDate, setEndDate] = useState<Date | undefined>(
        searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
    );

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("search", term);
        } else {
            params.delete("search");
        }
        params.set("page", "1"); // Reset page
        router.replace(`?${params.toString()}`);
    }, 300);

    const handleStatusChange = (value: string) => {
        setStatus(value);
        const params = new URLSearchParams(searchParams);
        if (value && value !== "ALL") {
            params.set("status", value);
        } else {
            params.delete("status");
        }
        params.set("page", "1");
        router.replace(`?${params.toString()}`);
    };

    const handleDateChange = (type: "start" | "end", date: Date | undefined) => {
        if (type === "start") setStartDate(date);
        else setEndDate(date);

        const params = new URLSearchParams(searchParams);
        if (date) {
            params.set(`${type}Date`, date.toISOString());
        } else {
            params.delete(`${type}Date`);
        }
        params.set("page", "1");
        router.replace(`?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearch("");
        setStatus("ALL");
        setStartDate(undefined);
        setEndDate(undefined);
        router.replace("?");
    };

    return (
        <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search expenses..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            handleSearch(e.target.value);
                        }}
                    />
                </div>
                <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="DISBURSED">Disbursed</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                    <DatePicker
                        date={startDate}
                        setDate={(date) => handleDateChange("start", date)}
                        placeholder="Start Date"
                    />
                    <span className="text-muted-foreground">-</span>
                    <DatePicker
                        date={endDate}
                        setDate={(date) => handleDateChange("end", date)}
                        placeholder="End Date"
                    />
                </div>
                {(search || status !== "ALL" || startDate || endDate) && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear Filters">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
