
"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

type Expense = {
    id: string;
    description: string;
    amount: number;
    status: string;
    category: string;
    incurredAt: Date;
    requester: { name: string | null };
};

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Requester</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                            <TableCell className="font-medium">{expense.description}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell>{format(new Date(expense.incurredAt), "MMM d, yyyy")}</TableCell>
                            <TableCell>{expense.requester.name}</TableCell>
                            <TableCell>
                                <Badge variant={
                                    expense.status === "APPROVED" ? "default" : // Use default and override color
                                        expense.status === "DISBURSED" ? "default" :
                                            expense.status === "REJECTED" ? "destructive" :
                                                expense.status === "CERTIFIED" ? "secondary" :
                                                    "outline"
                                } className={
                                    expense.status === "APPROVED" ? "bg-green-500 hover:bg-green-600" :
                                        expense.status === "DISBURSED" ? "bg-blue-500 hover:bg-blue-600" :
                                            expense.status === "PENDING" ? "bg-yellow-500 hover:bg-yellow-600 text-white" :
                                                ""
                                }>
                                    {expense.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">NGN {expense.amount.toLocaleString()}</TableCell>
                            <TableCell>
                                <Link href={`/dashboard/expenses/${expense.id}`}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
