
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ExpensesTableProps {
    data: any[];
    currentPage: number;
    totalPages: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export function ExpensesTable({
    data,
    currentPage,
    totalPages,
    totalCount,
    onPageChange,
    isLoading
}: ExpensesTableProps) {
    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Payee</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No expenses found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{format(new Date(expense.incurredAt), "MMM d, yyyy")}</TableCell>
                                    <TableCell className="font-medium">{expense.description}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{expense.category}</Badge>
                                    </TableCell>
                                    <TableCell>{expense.payee || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={expense.status === "APPROVED" ? "default" : "secondary"}>
                                            {expense.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-red-600">
                                        ₦{Number(expense.amount).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Total {totalCount} records
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <div className="text-sm font-medium">
                        Page {currentPage} of {Math.max(1, totalPages)}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages || isLoading}
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
