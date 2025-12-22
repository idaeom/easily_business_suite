import { getTransactions, getIncomeMetrics, getAllProviderBalances, getAccountBalancesByType } from "@/actions/finance";
import { getPaystackBalance } from "@/app/actions";
import { getAppMode } from "@/actions/app-mode";
import { TestConfig } from "@/lib/test-config";
import { IncomeChart } from "@/components/finance/IncomeChart";
import { Pagination } from "@/components/Pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, ArrowUpRight, ArrowDownLeft, CreditCard, Wallet, Info } from "lucide-react";
import Link from "next/link";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";



export default async function FinancePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const tab = typeof params.tab === "string" ? params.tab : "overview";
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const appMode = await getAppMode();
    const isTestMode = appMode === "TEST";

    // Fetch Data
    const providerBalances = await getAllProviderBalances();
    const assetAccounts = await getAccountBalancesByType("ASSET");
    const incomeAccounts = await getAccountBalancesByType("INCOME");

    const { data: transactions, metadata: transactionsMeta } = await getTransactions(page, limit);
    const { totalIncome, chartData } = await getIncomeMetrics();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
                <div className="flex gap-2">
                    <Link href="/dashboard/finance/journals">
                        <Button variant="outline">
                            <Banknote className="mr-2 h-4 w-4" />
                            Manual Journal
                        </Button>
                    </Link>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="income">Inflow Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Provider Balances (Live API) */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {providerBalances.map((pb) => (
                            <Card key={pb.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        {pb.name}
                                        <HoverCard>
                                            <HoverCardTrigger>
                                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-80">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-semibold">Provider Balance</h4>
                                                    <p className="text-sm">
                                                        This is the actual balance held by {pb.provider}. It represents real funds available for disbursement.
                                                    </p>
                                                </div>
                                            </HoverCardContent>
                                        </HoverCard>
                                    </CardTitle>
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">₦{Number(pb.balance).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {pb.provider} Balance (Live)
                                    </p>
                                </CardContent>
                            </Card>
                        ))}

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Revenue
                                </CardTitle>
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">₦{Number(totalIncome).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <p className="text-xs text-muted-foreground">
                                    Lifetime Income
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Wallets (Assets) */}
                        <Card className="col-span-2 border-blue-100 shadow-sm">
                            <CardHeader className="bg-blue-50/50 pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-blue-900 flex items-center gap-2">
                                        <Wallet className="h-5 w-5" />
                                        My Business Wallet
                                        <HoverCard>
                                            <HoverCardTrigger>
                                                <Info className="h-4 w-4 text-blue-400 cursor-help" />
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-80">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-semibold">Operating Accounts</h4>
                                                    <p className="text-sm">
                                                        These are your internal ledger accounts for day-to-day operations. Funds here are tracked internally but must be backed by real provider balances.
                                                    </p>
                                                </div>
                                            </HoverCardContent>
                                        </HoverCard>
                                    </CardTitle>
                                    <Badge variant="outline" className="bg-white text-blue-700 border-blue-200">
                                        Operating Account
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Account Details</TableHead>
                                            <TableHead className="text-right">Available Balance</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assetAccounts.map((acc) => (
                                            <TableRow key={acc.id}>
                                                <TableCell>
                                                    <div className="font-bold text-base text-slate-800">{acc.name}</div>
                                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{acc.code}</div>
                                                    {/* Show Linked Details */}
                                                    {/* @ts-ignore */}
                                                    {acc.accountNumber ? (
                                                        <div className="mt-2 text-xs bg-slate-100 inline-flex items-center gap-2 px-2 py-1 rounded border border-slate-200">
                                                            <span className="font-semibold text-slate-600">
                                                                {/* @ts-ignore */}
                                                                {acc.bankName}
                                                            </span>
                                                            <span className="font-mono text-slate-800">
                                                                {/* @ts-ignore */}
                                                                {acc.accountNumber}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 text-xs text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100">
                                                            No Virtual Account Linked
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="text-2xl font-bold text-slate-900">
                                                        ₦{Number(acc.balance).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* @ts-ignore */}
                                                        {/* @ts-ignore */}
                                                        {!acc.accountNumber && (acc.name.includes("Bank") || acc.name.includes("Wallet")) && (
                                                            <form action={async () => {
                                                                "use server";
                                                                const { createDedicatedAccountAction } = await import("@/actions/finance");
                                                                await createDedicatedAccountAction("PAYSTACK", acc.id);
                                                            }}>
                                                                <Button size="sm" variant="outline" className="h-8 text-xs">
                                                                    Link NUBAN
                                                                </Button>
                                                            </form>
                                                        )}
                                                        {/* @ts-ignore */}
                                                        {TestConfig.isTestAccount(acc.bankName) && (
                                                            <form action={async () => {
                                                                "use server";
                                                                const { simulateInflowAction } = await import("@/actions/finance");
                                                                await simulateInflowAction(acc.id, 50000);
                                                            }}>
                                                                <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
                                                                    + Fund ₦50k
                                                                </Button>
                                                            </form>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Revenue (Income) */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    Revenue Sources (Income)
                                    <HoverCard>
                                        <HoverCardTrigger>
                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                        </HoverCardTrigger>
                                        <HoverCardContent className="w-80">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-semibold">Income Accounts</h4>
                                                <p className="text-sm">
                                                    Tracks all revenue streams. Credit balances here represent money earned. These are strictly for reporting and cannot be "spent" directly.
                                                </p>
                                            </div>
                                        </HoverCardContent>
                                    </HoverCard>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Account</TableHead>
                                            <TableHead className="text-right">Total Credit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {incomeAccounts.map((acc) => (
                                            <TableRow key={acc.id}>
                                                <TableCell>
                                                    <div className="font-medium">{acc.name}</div>
                                                    <div className="text-xs text-muted-foreground">{acc.code}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ₦{Number(acc.balance).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TransactionTable transactions={transactions.slice(0, 5)} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TransactionTable transactions={transactions} />
                            <Pagination
                                currentPage={transactionsMeta.currentPage}
                                totalItems={transactionsMeta.totalItems}
                                pageSize={transactionsMeta.pageSize}
                                viewParam="transactionsView" // Optional custom key if needed, or default
                                pageParam="page"
                                limitParam="limit"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="income" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Income Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <IncomeChart data={chartData} />
                            <div className="mt-4">
                                <h3 className="font-semibold mb-2">Monthly Breakdown</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Month</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {chartData.map((item) => (
                                            <TableRow key={item.date}>
                                                <TableCell>{item.date}</TableCell>
                                                <TableCell className="text-right">₦{Number(item.amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                        {chartData.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                                                    No income data available.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TransactionTable({ transactions }: { transactions: any[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[150px]">Date</TableHead>
                    <TableHead className="w-[250px]">Description</TableHead>
                    <TableHead>
                        <div className="flex items-center gap-2">
                            Ledger Entries (Double Entry)
                            <HoverCard>
                                <HoverCardTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-semibold">Double Entry System</h4>
                                        <p className="text-sm">
                                            Every transaction has at least one Debit (DR) and one Credit (CR). Total Debits must equal Total Credits.
                                        </p>
                                    </div>
                                </HoverCardContent>
                            </HoverCard>
                        </div>
                    </TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.map((tx) => (
                    <TableRow key={tx.id} className="align-top">
                        <TableCell className="py-4">
                            <div className="font-medium">{new Date(tx.date).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground mt-1">{new Date(tx.date).toLocaleTimeString()}</div>
                        </TableCell>
                        <TableCell className="py-4">
                            <div className="font-medium">{tx.description}</div>
                            <div className="text-xs font-mono text-muted-foreground mt-1">{tx.reference}</div>
                        </TableCell>
                        <TableCell className="py-4">
                            <div className="space-y-2">
                                {tx.entries.map((entry: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm border-b border-dashed border-gray-100 last:border-0 pb-1 last:pb-0">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={entry.direction === "DEBIT" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"}>
                                                {entry.direction === "DEBIT" ? "DR" : "CR"}
                                            </Badge>
                                            <span className="text-gray-600">{entry.account?.name || "Unknown Account"}</span>
                                        </div>
                                        <span className="font-mono font-medium">
                                            ₦{Math.abs(Number(entry.amount)).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell className="py-4">
                            <Badge variant={tx.status === "POSTED" ? "default" : "secondary"}>
                                {tx.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
                {transactions.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                            No transactions found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
