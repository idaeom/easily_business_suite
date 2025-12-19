"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function ExpenseList({ expenses }: { expenses: any[] }) {
    if (expenses.length === 0) {
        return (
            <Card>
                <CardContent>
                    <div className="text-center py-10 text-muted-foreground">
                        No expenses found.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            className="grid gap-4 md:grid-cols-2"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {expenses.map((expense) => (
                <motion.div key={expense.id} variants={item}>
                    <Link href={`/dashboard/expenses/${expense.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full border-l-4 border-l-transparent hover:border-l-blue-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium truncate pr-4">
                                    {expense.description}
                                </CardTitle>
                                <Badge variant={
                                    expense.status === "APPROVED" ? "default" :
                                        expense.status === "DISBURSED" ? "default" :
                                            expense.status === "REJECTED" ? "destructive" :
                                                expense.status === "CERTIFIED" ? "secondary" :
                                                    "outline" // Pending or others
                                } className={
                                    expense.status === "APPROVED" ? "bg-green-500 hover:bg-green-600" :
                                        expense.status === "DISBURSED" ? "bg-blue-500 hover:bg-blue-600" :
                                            expense.status === "PENDING" ? "bg-yellow-500 hover:bg-yellow-600 text-white" :
                                                ""
                                }>
                                    {expense.status}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">NGN {expense.amount.toLocaleString()}</div>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-xs text-muted-foreground">
                                        {expense.requester?.name || "Unknown"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(expense.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </motion.div>
            ))}
        </motion.div>
    );
}
