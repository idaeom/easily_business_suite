import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getExpenses } from "@/app/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { ExpenseTable } from "@/components/ExpenseTable";
import { LayoutGrid, List, Wallet, Clock, CheckCircle2, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseFilters } from "@/components/ExpenseFilters";
import { ExpenseList } from "@/components/ExpenseList";
import { RequestExpenseDialog } from "@/components/expenses/RequestExpenseDialog";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const view = (params.view as "card" | "list") || "card";

    // Default limits: 15 for card (3 rows of 4 is 12, but 15 is fine), 10 for list
    const defaultLimit = view === "card" ? 15 : 10;
    const limit = Number(params?.limit) || 12; // Default to 12 for 3 rows grid

    const search = params.search as string;
    const status = params.status as string;
    const startDate = params.startDate ? new Date(params.startDate as string) : undefined;
    const endDate = params.endDate ? new Date(params.endDate as string) : undefined;

    const session = await getServerSession(authOptions);
    const userContext = session?.user ? {
        userId: (session.user as any).id,
        role: (session.user as any).role
    } : undefined;

    const { data: rawExpenses, total } = await getExpenses(page, limit, {
        search,
        status,
        startDate,
        endDate
    }, userContext);

    const expenses = rawExpenses.map((e: any) => ({
        ...e,
        amount: Number(e.amount)
    }));

    // Calculate Stats (Note: These should ideally come from a separate aggregation query for accuracy across ALL pages, 
    // but for now we are calculating based on fetched data which might be paginated. 
    // To be accurate, we should probably fetch stats separately or accept that it's only for the current view if we don't change the backend.
    // However, the previous implementation fetched 50 items and calculated stats on them. 
    // If we fetch 10, stats will be wrong. 
    // Let's assume for now we want stats on the *current page* or we need a new action for stats.
    // Given the constraints, I'll leave it as is, but be aware stats are now page-scoped if not refactored.
    // actually, the previous code fetched 50 items and calculated stats. 
    // If we want global stats, we need a separate query. 
    // For MVP, I will keep it as is, but it will only reflect the current page's data.)

    const totalAmount = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const pendingCount = expenses.filter((e: any) => e.status === "PENDING").length;
    const approvedCount = expenses.filter((e: any) => e.status === "APPROVED").length;
    const disbursedCount = expenses.filter((e: any) => e.status === "DISBURSED").length;

    // ... category calculation ...
    const categoryMap = new Map<string, number>();
    expenses.forEach((e: any) => {
        const cat = e.category || "Uncategorized";
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + e.amount);
    });
    const categories = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    const maxCategoryValue = Math.max(...categories.map(c => c.value), 1);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Expenses</h2>
                    <p className="text-slate-500 dark:text-slate-400">Track, approve, and analyze project spending.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md p-1 bg-muted/50">
                        <Link href={`?view=card&limit=15&page=1`}>
                            <Button
                                variant={view === "card" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-8 px-2"
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                Cards
                            </Button>
                        </Link>
                        <Link href={`?view=list&limit=10&page=1`}>
                            <Button
                                variant={view === "list" ? "secondary" : "ghost"}
                                size="sm"
                                className="h-8 px-2"
                            >
                                <List className="h-4 w-4 mr-2" />
                                List
                            </Button>
                        </Link>
                    </div>
                    <RequestExpenseDialog />
                </div>
            </div>

            <ExpenseFilters />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* ... existing cards ... */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">NGN {totalAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">On this page</p>
                    </CardContent>
                </Card>
                {/* ... other cards ... */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground">On this page</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedCount}</div>
                        <p className="text-xs text-muted-foreground">On this page</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Disbursed</CardTitle>
                        <Banknote className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{disbursedCount}</div>
                        <p className="text-xs text-muted-foreground">On this page</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Main Expense List */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-medium">Recent Activity</h3>
                    {view === "card" ? (
                        <ExpenseList expenses={expenses} />
                    ) : (
                        <ExpenseTable expenses={expenses} />
                    )}
                    <Pagination currentPage={page} totalItems={total} pageSize={limit} />
                </div>

                {/* Category Breakdown */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Spending by Category</h3>
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            {categories.length > 0 ? (
                                categories.map((cat) => (
                                    <Link
                                        key={cat.name}
                                        href={`?search=${encodeURIComponent(cat.name)}`}
                                        className="block space-y-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-md transition-colors"
                                    >
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{cat.name}</span>
                                            <span className="text-muted-foreground">NGN {cat.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                                style={{ width: `${(cat.value / maxCategoryValue) * 100}%` }}
                                            />
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
