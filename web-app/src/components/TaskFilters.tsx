"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function TaskFilters({ stages }: { stages: any[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [status, setStatus] = useState(searchParams.get("status") || "ALL");
    const [date, setDate] = useState<{ from: Date | undefined; to: Date | undefined } | undefined>(
        searchParams.get("startDate") ? {
            from: new Date(searchParams.get("startDate")!),
            to: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined
        } : undefined
    );

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            updateFilters({ search });
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const updateFilters = (newFilters: any) => {
        const params = new URLSearchParams(searchParams.toString());

        if (newFilters.search !== undefined) {
            if (newFilters.search) params.set("search", newFilters.search);
            else params.delete("search");
        }

        if (newFilters.status !== undefined) {
            if (newFilters.status && newFilters.status !== "ALL") params.set("status", newFilters.status);
            else params.delete("status");
        }

        if (newFilters.date !== undefined) {
            if (newFilters.date?.from) params.set("startDate", newFilters.date.from.toISOString());
            else params.delete("startDate");

            if (newFilters.date?.to) params.set("endDate", newFilters.date.to.toISOString());
            else params.delete("endDate");
        }

        // Reset page on filter change
        params.set("page", "1");

        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                />
            </div>

            <Select
                value={status}
                onValueChange={(val) => {
                    setStatus(val);
                    updateFilters({ status: val });
                }}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="CERTIFIED">Certified</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    {stages.length > 0 && <div className="border-t my-1" />}
                    {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(val) => {
                            const normalizedVal = val ? { from: val.from, to: val.to } : undefined;
                            setDate(normalizedVal);
                            updateFilters({ date: normalizedVal });
                        }}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>

            {(search || status !== "ALL" || date) && (
                <Button
                    variant="ghost"
                    onClick={() => {
                        setSearch("");
                        setStatus("ALL");
                        setDate(undefined);
                        router.push("?");
                    }}
                >
                    <X className="h-4 w-4 mr-2" />
                    Reset
                </Button>
            )}
        </div>
    );
}
