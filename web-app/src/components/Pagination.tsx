"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LayoutGrid, LayoutList } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


export function Pagination({
    currentPage,
    totalItems,
    pageSize,
    showViewToggle = false,
    pageParam = "page",
    limitParam = "limit",
    viewParam = "view",
    enablePagination = true,
}: {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    showViewToggle?: boolean;
    pageParam?: string;
    limitParam?: string;
    viewParam?: string;
    enablePagination?: boolean;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const totalPages = Math.ceil(totalItems / pageSize);
    const currentView = searchParams.get(viewParam) || "list";

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set(pageParam, page.toString());
        router.push(`?${params.toString()}`);
    };

    const handleLimitChange = (limit: string) => {
        const params = new URLSearchParams(searchParams);
        params.set(limitParam, limit);
        params.set(pageParam, "1"); // Reset to page 1
        router.push(`?${params.toString()}`);
    };

    const handleViewChange = (view: string) => {
        if (!view) return;
        const params = new URLSearchParams(searchParams);
        params.set(viewParam, view);
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
                {enablePagination && (
                    <div className="flex items-center space-x-2">
                        <p className="text-sm text-muted-foreground">Rows per page</p>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={handleLimitChange}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={pageSize.toString()} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 20, 50, 100].map((size) => (
                                    <SelectItem key={size} value={size.toString()}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {showViewToggle && (
                    <div className="border rounded-md flex items-center p-0.5">
                        <Button
                            variant={currentView === "list" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleViewChange("list")}
                        >
                            <LayoutList className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={currentView === "card" ? "secondary" : "ghost"}
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleViewChange("card")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {enablePagination && (
                <div className="flex items-center space-x-2">
                    <div className="text-sm text-muted-foreground mr-4">
                        Page {currentPage} of {Math.max(1, totalPages)}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
