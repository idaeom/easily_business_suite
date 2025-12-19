import { getTeams } from "@/app/actions";
import { CreateBudgetDialog } from "@/components/CreateBudgetDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { budgets, expenses } from "@/db/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { format, startOfYear, endOfYear } from "date-fns";
import { Info, AlertTriangle } from "lucide-react";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

async function getData() {
    const db = await getDb();

    // 1. Get Categories
    const categories = await db.query.expenseCategories.findMany({
        orderBy: (categories, { asc }) => [asc(categories.name)],
    });

    // 2. Get Budgets
    const allBudgets = await db.query.budgets.findMany({
        with: { category: true },
        orderBy: [desc(budgets.createdAt)],
    });

    // 3. Get Expenses for current year (to match default annual budget)
    // In a real app, we should match the specific budget's date range.
    // For now, we'll fetch all expenses and filter in memory or just fetch current year.
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());

    const allExpenses = await db.query.expenses.findMany({
        where: and(
            gte(expenses.incurredAt, start),
            lte(expenses.incurredAt, end)
        )
    });

    return { categories, allBudgets, allExpenses };
}

export default async function BudgetsPage() {
    const { categories, allBudgets, allExpenses } = await getData();

    // Map budgets by categoryId (Keep NEWEST)
    const budgetMap = new Map();
    for (const b of allBudgets) {
        if (!budgetMap.has(b.categoryId)) {
            budgetMap.set(b.categoryId, b);
        }
    }

    // Aggregate expenses by category
    // We match expense.category to category.id OR category.name
    const expenseMap = new Map<string, number>();

    for (const expense of allExpenses) {
        if (!expense.category) continue;

        // Try to find category by ID
        let catId = expense.category;

        // If not a UUID (roughly), check if it matches a name
        // This is a heuristic. Ideally expenses should store ID.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expense.category);

        if (!isUuid) {
            const cat = categories.find(c => c.name.toLowerCase() === expense.category?.toLowerCase());
            if (cat) catId = cat.id;
        }

        const current = expenseMap.get(catId) || 0;
        expenseMap.set(catId, current + Number(expense.amount));
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    Budgets
                    <HoverCard>
                        <HoverCardTrigger>
                            <Info className="h-5 w-5 text-muted-foreground cursor-help" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold">Budget Tracking</h4>
                                <p className="text-sm">
                                    Budgets set spending limits for categories over a specific period. Expenses are tracked against these limits to prevent overspending.
                                </p>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                </h1>
                <CreateBudgetDialog categories={categories} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Budget Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Category</TableHead>
                                <TableHead>Budget</TableHead>
                                <TableHead>Spent</TableHead>
                                <TableHead className="w-[200px]">Utilization</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => {
                                const budget = budgetMap.get(category.id);
                                const displayAmount = budget ? Number(budget.amount) : 0;
                                const displayStartDate = budget ? format(budget.startDate, "MMM d") : "Jan 1";
                                const displayEndDate = budget ? format(budget.endDate, "MMM d, yyyy") : "Dec 31, " + new Date().getFullYear();

                                const spent = expenseMap.get(category.id) || 0;
                                const isOverBudget = displayAmount > 0 && spent > displayAmount;
                                const percentage = displayAmount > 0 ? Math.min((spent / displayAmount) * 100, 100) : 0;

                                return (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell>NGN {displayAmount.toLocaleString()}</TableCell>
                                        <TableCell className={isOverBudget ? "text-red-600 font-medium" : ""}>
                                            NGN {spent.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                                                </div>
                                                <Progress value={percentage} className={isOverBudget ? "bg-red-100 [&>div]:bg-red-500 h-2" : "h-2"} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {displayStartDate} - {displayEndDate}
                                        </TableCell>
                                        <TableCell>
                                            {isOverBudget ? (
                                                <Badge variant="destructive" className="flex items-center w-fit gap-1">
                                                    <AlertTriangle className="h-3 w-3" /> Over
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    On Track
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <CreateBudgetDialog
                                                categories={categories}
                                                defaultCategoryId={category.id}
                                                budget={budget ? { ...budget, category } : undefined}
                                                trigger={
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Edit</span>
                                                        <span className="text-xs underline">Edit</span>
                                                    </Button>
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {categories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                                        No categories found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
