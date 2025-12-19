"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreateExpenseModal from "@/components/expenses/CreateExpenseModal";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle2, Banknote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface TaskExpensesProps {
    taskId: string;
    expenses: any[];
    totals: {
        estimate: number;
        approved: number;
        disbursed: number;
    };
}

export function TaskExpenses({ taskId, expenses, totals }: TaskExpensesProps) {
    const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
    const router = useRouter();

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Linked Expenses</CardTitle>
                <Button size="sm" onClick={() => setExpenseModalOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> New Expense
                </Button>
                <CreateExpenseModal
                    taskId={taskId}
                    isOpen={isExpenseModalOpen}
                    onClose={() => {
                        setExpenseModalOpen(false);
                        router.refresh();
                    }}
                />
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Totals Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/30 p-2 rounded-md">
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
                            <Wallet className="h-3 w-3" /> Estimate
                        </div>
                        <div className="font-semibold text-sm">
                            NGN {totals.estimate.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-green-500/10 p-2 rounded-md">
                        <div className="text-xs text-green-600 flex items-center justify-center gap-1 mb-1">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                        </div>
                        <div className="font-semibold text-sm text-green-700">
                            NGN {totals.approved.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-blue-500/10 p-2 rounded-md">
                        <div className="text-xs text-blue-600 flex items-center justify-center gap-1 mb-1">
                            <Banknote className="h-3 w-3" /> Disbursed
                        </div>
                        <div className="font-semibold text-sm text-blue-700">
                            NGN {totals.disbursed.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Expenses List */}
                {expenses.length > 0 ? (
                    <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {expenses.map((expense: any) => (
                            <li key={expense.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors">
                                <Link href={`/dashboard/expenses/${expense.id}`} className="hover:underline flex-1 min-w-0 mr-2">
                                    <div className="truncate text-sm font-medium">{expense.description}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1">{expense.status}</Badge>
                                        <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </Link>
                                <span className="text-sm font-medium whitespace-nowrap">
                                    NGN {Number(expense.amount).toLocaleString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No linked expenses.</p>
                )}
            </CardContent>
        </Card>
    );
}
