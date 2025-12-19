
import React from "react";
import { getDb } from "@/db";
import { shifts, shiftReconciliations, posTransactions, shiftCashDeposits, accounts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import ReconcileButton from "../ReconcileButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Wallet, CreditCard, Banknote, ArrowRightLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddCashDepositDialog } from "../AddCashDepositDialog";
import { CloseShiftDialog } from "../CloseShiftDialog";
import { ConfirmAction } from "../ConfirmAction";

export default async function ShiftDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const db = await getDb();

    // Fetch Shift with Relations
    const shift = await db.query.shifts.findFirst({
        where: eq(shifts.id, params.id),
        with: {
            cashier: true,
            reconciliations: true,
            cashDeposits: true,
            transactions: {
                with: { payments: true },
                orderBy: [desc(posTransactions.transactionDate)]
            }
        }
    });

    if (!shift) notFound();

    const allAccounts = await db.query.accounts.findMany();
    const accountMap = new Map(allAccounts.map(a => [a.id, a.name]));
    const getAccountName = (id?: string | null) => id ? accountMap.get(id) || "Unknown Account" : undefined;


    // Calculate Payment Method Totals
    const methodTotals: Record<string, number> = {};
    shift.transactions.forEach(tx => {
        tx.payments.forEach(p => {
            const code = p.paymentMethodCode;
            methodTotals[code] = (methodTotals[code] || 0) + Number(p.amount);
        });
    });

    // Cash Specifics
    const cashSales = methodTotals["CASH"] || 0;
    const startCash = Number(shift.startCash || 0);
    const totalDeposits = shift.cashDeposits.reduce((acc, d) => acc + Number(d.amount), 0);
    const expectedDrawer = startCash + cashSales - totalDeposits; // If deposits are "drops" from drawer to safe.
    // Wait, user said: "deposited into one of the companies account... until the cash till balances"
    // So "Deposits" here are REMOVALS from the drawer to the bank/safe?
    // "accomodate for multiple entiries until the cash till balances" -> Implies verifying partial deposits.

    // Reconciliation Data (if closed/reconciled)
    const getReconciliation = (code: string) => shift.reconciliations.find(r => r.paymentMethodCode === code);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/business/pos/shifts">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                        </Link>
                        <h2 className="text-3xl font-bold tracking-tight">Shift #{shift.id.slice(0, 8)}</h2>
                    </div>
                    <p className="text-muted-foreground ml-10">
                        Cashier: <span className="font-medium text-foreground">{shift.cashier.name}</span> •
                        Status: <Badge variant="outline">{shift.status}</Badge>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {shift.status === "OPEN" && (
                        <>
                            <AddCashDepositDialog shiftId={shift.id} />
                            <CloseShiftDialog shiftId={shift.id} />
                        </>
                    )}
                    {shift.status === "CLOSED" && (
                        <ReconcileButton shiftId={shift.id} />
                    )}
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="cash">Cash Reconciliation</TabsTrigger>
                    <TabsTrigger value="card">Card / Transfer</TabsTrigger>
                    <TabsTrigger value="logs">Transaction Log</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                                <Banknote className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(shift.transactions.reduce((acc, tx) => acc + Number(tx.totalAmount), 0))}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Cash in Drawer (Exp)</CardTitle>
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(expectedDrawer)}</div>
                                <p className="text-xs text-muted-foreground">After {shift.cashDeposits.length} deposits</p>
                            </CardContent>
                        </Card>
                    </div>

                </TabsContent>

                <TabsContent value="cash" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Cash Drawer Analysis</CardTitle>
                                <CardDescription>Track cash movement from start to finish.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between py-2 border-b">
                                    <span>Opening Balance</span>
                                    <span className="font-medium">{formatCurrency(startCash)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span>+ Cash Sales</span>
                                    <span className="font-medium text-green-600">{formatCurrency(cashSales)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span>- Partial Deposits (Drops)</span>
                                    <span className="font-medium text-red-600">({formatCurrency(totalDeposits)})</span>
                                </div>
                                <div className="flex justify-between py-2 font-bold text-lg">
                                    <span>= Expected in Drawer</span>
                                    <span>{formatCurrency(expectedDrawer)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Deposits Log</CardTitle>
                                <CardDescription>Cash removed from drawer to bank/safe.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {shift.cashDeposits.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No deposits recorded.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Account</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {shift.cashDeposits.map(d => (
                                                <TableRow key={d.id}>
                                                    <TableCell>{getAccountName(d.accountId) || "Safe"}</TableCell>
                                                    <TableCell>{formatCurrency(Number(d.amount))}</TableCell>
                                                    <TableCell>{formatDate(d.createdAt)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {d.status === "CONFIRMED" ? (
                                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Confirmed</Badge>
                                                        ) : (
                                                            <ConfirmAction
                                                                id={d.id}
                                                                type="deposit"
                                                                details={{
                                                                    label: "Cash Deposit",
                                                                    amount: Number(d.amount),
                                                                    accountName: getAccountName(d.accountId) || "Safe",
                                                                    expected: Number(d.amount),
                                                                    actual: Number(d.amount)
                                                                }}
                                                            />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* Final Cash Reconciliation */}
                        {shift.reconciliations.filter(r => r.paymentMethodCode === 'CASH').map(rec => {
                            const diff = Number(rec.difference);
                            return (
                                <Card key={rec.id} className="md:col-span-2">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Final Drawer Verification</CardTitle>
                                            <CardDescription>Confirm the final cash amount remaining in the till.</CardDescription>
                                        </div>
                                        {rec.status === "CONFIRMED" ? (
                                            <Badge className="bg-green-600">Reconciled</Badge>
                                        ) : (
                                            <ConfirmAction
                                                id={rec.id}
                                                type="reconciliation"
                                                details={{
                                                    label: "Cash in Drawer",
                                                    amount: Number(rec.actualAmount),
                                                    expected: Number(rec.expectedAmount),
                                                    actual: Number(rec.actualAmount)
                                                }}
                                            />
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-8">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Expected</div>
                                                <div className="text-2xl font-bold">{formatCurrency(Number(rec.expectedAmount))}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Actual Count</div>
                                                <div className="text-2xl font-bold">{formatCurrency(Number(rec.actualAmount))}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Variance</div>
                                                <div className={`text-2xl font-bold ${diff !== 0 ? "text-red-500" : "text-green-500"}`}>
                                                    {formatCurrency(diff)}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="card" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bank Reconciliation</CardTitle>
                            <CardDescription>Confirm receipt of funds in bank accounts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Method/Bank</TableHead>
                                        <TableHead className="text-right">Expected</TableHead>
                                        <TableHead className="text-right">Actual</TableHead>
                                        <TableHead className="text-right">Variance</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shift.reconciliations.filter(r => r.paymentMethodCode !== 'CASH').map((rec) => {
                                        const diff = Number(rec.difference);
                                        return (
                                            <TableRow key={rec.id}>
                                                <TableCell>
                                                    <div className="font-medium">{rec.paymentMethodCode}</div>
                                                    <div className="text-xs text-muted-foreground">{getAccountName(rec.accountId)}</div>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(Number(rec.expectedAmount))}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(Number(rec.actualAmount))}</TableCell>
                                                <TableCell className={`text-right font-bold ${diff !== 0 ? "text-red-500" : "text-green-500"}`}>
                                                    {formatCurrency(diff)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {rec.status === "CONFIRMED" ? (
                                                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Confirmed</Badge>
                                                    ) : (
                                                        <ConfirmAction
                                                            id={rec.id}
                                                            type="reconciliation"
                                                            details={{
                                                                label: rec.paymentMethodCode,
                                                                amount: Number(rec.actualAmount),
                                                                accountName: getAccountName(rec.accountId),
                                                                expected: Number(rec.expectedAmount),
                                                                actual: Number(rec.actualAmount)
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {shift.reconciliations.filter(r => r.paymentMethodCode !== 'CASH').length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">No non-cash transactions to reconcile.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction Detail Log</CardTitle>
                            <CardDescription>Reference for individual payments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Customer</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shift.transactions.flatMap(tx => tx.payments.filter(p => p.paymentMethodCode !== "CASH").map(p => ({ ...p, tx })))
                                        .map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{formatDate(item.tx.transactionDate)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{item.paymentMethodCode}</Badge>
                                                </TableCell>
                                                <TableCell>{formatCurrency(Number(item.amount))}</TableCell>
                                                <TableCell className="font-mono text-xs">{item.reference || "-"}</TableCell>
                                                <TableCell>{item.tx.contactId ? "Registered" : "Walk-in"}</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    {/* Transactions Log */}
                    <Card>
                        <CardHeader>
                            <CardTitle>All Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shift.transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                                            <TableCell>{formatCurrency(Number(tx.totalAmount))}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 flex-wrap">
                                                    {tx.payments.map(p => (
                                                        <Badge key={p.id} variant="secondary" className="text-xs">
                                                            {p.paymentMethodCode} {formatCurrency(Number(p.amount))}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>{tx.contactId ? "Registered" : "Walk-in"}</TableCell>
                                            <TableCell>{tx.status}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

