import { getDb } from "@/db";
import { expenses, attachments, comments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ExpenseActions } from "@/components/ExpenseActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { ExpenseComments } from "@/components/ExpenseComments";
import { ExpenseAttachments } from "@/components/ExpenseAttachments";
import { getAccounts } from "@/app/actions";

async function getExpense(id: string) {
    const db = await getDb();
    return db.query.expenses.findFirst({
        where: eq(expenses.id, id),
        with: {
            requester: true,
            approver: true,
            task: true,
            expenseCategory: true,
            attachments: {
                with: { uploader: true },
                orderBy: [desc(attachments.createdAt)],
            },
            beneficiaries: true,
            comments: {
                with: { user: true },
                orderBy: [desc(comments.createdAt)],
            },
        },
    });
}

import { getBusinessAccounts } from "@/actions/finance";

// ...

export default async function ExpenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [expense, accounts, businessAccounts] = await Promise.all([
        getExpense(id),
        getAccounts(),
        getBusinessAccounts()
    ]);

    if (!expense) {
        return <div>Expense not found</div>;
    }

    // Determine which accounts to show for payment
    // If Business Accounts are set up, use those. Otherwise fallback to all ASSET accounts.
    const rawSourceAccounts = businessAccounts.length > 0
        ? businessAccounts.map(b => b.glAccount).filter(Boolean)
        : accounts.filter((a: any) => a.type === "ASSET");

    // Deduplicate by ID to prevent "duplicate key" React error
    const sourceAccounts = Array.from(new Map(rawSourceAccounts.map(item => [item?.id, item])).values());

    // Convert Decimal to number for Client Component
    const expenseForClient = {
        ...expense,
        amount: Number(expense.amount),
    };

    const isDisbursed = expense.status === "DISBURSED";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/expenses">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Expenses
                    </Button>
                </Link>
            </div>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Expense Details</h1>
                    <p className="text-muted-foreground">{expense.description}</p>
                </div>
                <Badge variant={expense.status === "APPROVED" || expense.status === "DISBURSED" ? "default" : "secondary"}>
                    {expense.status}
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Amount</div>
                                <div className="text-2xl font-bold">NGN {Number(expense.amount).toLocaleString()}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Requester</div>
                                    <div>{expense.requester?.name || "Unknown"}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Category</div>
                                    <div>{expense.expenseCategory?.name || expense.category || "Uncategorized"}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Date Incurred</div>
                                    <div>{expense.incurredAt ? format(expense.incurredAt, "PPP") : "N/A"}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Created</div>
                                    <div>{format(expense.createdAt, "PPP")}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {expense.beneficiaries && expense.beneficiaries.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Beneficiaries</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-muted-foreground">
                                            <tr>
                                                <th className="p-2 font-medium">Name</th>
                                                <th className="p-2 font-medium">Bank</th>
                                                <th className="p-2 font-medium">Account</th>
                                                <th className="p-2 font-medium text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expense.beneficiaries.map((b: any) => (
                                                <tr key={b.id} className="border-t">
                                                    <td className="p-2">{b.name}</td>
                                                    <td className="p-2">{b.bankName}</td>
                                                    <td className="p-2">{b.accountNumber}</td>
                                                    <td className="p-2 text-right">NGN {Number(b.amount).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Linked Task</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {expense.task ? (
                                <Link href={`/dashboard/tasks/${expense.task.id}`} className="block p-4 border rounded-md hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline">{expense.task.uniqueNumber}</Badge>
                                        <Badge variant="secondary" className="text-xs">{expense.task.status}</Badge>
                                    </div>
                                    <div className="font-medium">{expense.task.title}</div>
                                </Link>
                            ) : (
                                <p className="text-sm text-muted-foreground">No task linked to this expense.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Review and manage this expense request.
                            </p>
                            <ExpenseActions
                                expense={expenseForClient}
                                accounts={sourceAccounts}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Attachments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ExpenseAttachments expenseId={expense.id} attachments={expense.attachments} isDisbursed={isDisbursed} />
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Comments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ExpenseComments expenseId={expense.id} comments={expense.comments} isDisbursed={isDisbursed} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
