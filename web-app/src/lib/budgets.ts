import { getDb } from "@/db";
import { budgets, expenses, tasks, expenseCategories } from "@/db/schema";
import { eq, and, lte, gte, inArray, desc, sql } from "drizzle-orm";
import { AuditService } from "@/lib/audit";

export class BudgetService {
    static async createBudget(categoryId: string, amount: number, startDate: Date, endDate: Date, userId: string) {
        const db = await getDb();
        return db.transaction(async (tx) => {
            // Check for overlapping budgets for this category
            const existing = await tx.query.budgets.findFirst({
                where: and(
                    eq(budgets.categoryId, categoryId),
                    lte(budgets.startDate, endDate),
                    gte(budgets.endDate, startDate)
                )
            });

            if (existing) {
                throw new Error(`A budget already exists for this category in this period (${existing.startDate.toDateString()} - ${existing.endDate.toDateString()})`);
            }

            const [budget] = await tx.insert(budgets).values({
                categoryId,
                amount: amount.toString(),
                startDate,
                endDate,
            }).returning();

            await AuditService.log(userId, "CREATE_BUDGET", "Budget", budget.id, { amount, categoryId }, tx);
            return budget;
        });
    }

    static async getCategoryBudgets(categoryId: string) {
        const db = await getDb();
        return db.query.budgets.findMany({
            where: eq(budgets.categoryId, categoryId),
            orderBy: [desc(budgets.startDate)],
            with: { category: true }
        });
    }

    static async getAllBudgets() {
        const db = await getDb();
        return db.query.budgets.findMany({
            orderBy: [desc(budgets.startDate)],
            with: { category: true }
        });
    }

    /**
     * Checks if a new expense fits within the budget.
     * @param categoryName - The name of the expense category (as stored in expenses table)
     */
    static async checkBudget(categoryName: string, amount: number, date: Date = new Date()) {
        const db = await getDb();

        // 1. Resolve Category Name to ID
        // The expenses table currently stores 'category' as a string. 
        // We need to find the corresponding ExpenseCategory to check the budget.
        const category = await db.query.expenseCategories.findFirst({
            where: eq(sql`lower(${expenseCategories.name})`, categoryName.toLowerCase())
        });

        if (!category) {
            // No category definition found, so no budget can exist.
            return { status: "NO_BUDGET", remaining: 0, limit: 0, totalSpent: 0 };
        }

        // 2. Find the Budget that covers the Expense Date
        const activeBudgetResult = await db.select().from(budgets)
            .where(and(
                eq(budgets.categoryId, category.id),
                lte(budgets.startDate, date),
                gte(budgets.endDate, date)
            ))
            .limit(1);

        const activeBudget = activeBudgetResult[0];

        if (!activeBudget) {
            return { status: "NO_BUDGET", remaining: 0, limit: 0, totalSpent: 0 };
        }

        // 3. Calculate Total Spent
        // We sum up expenses that have this category name AND fall within the budget window.
        // Note: This relies on the string match of 'category'. 
        // Ideally, we should migrate expenses to use categoryId, but for now we match by name.
        const expensesResult = await db.select({ total: sql<string>`coalesce(sum(${expenses.amount}), '0')` })
            .from(expenses)
            .where(and(
                eq(expenses.category, categoryName), // Match by name
                gte(expenses.incurredAt, activeBudget.startDate),
                lte(expenses.incurredAt, activeBudget.endDate),
                inArray(expenses.status, ["APPROVED", "DISBURSED", "CERTIFIED", "PENDING"])
            ));

        const totalSpent = parseFloat(expensesResult[0]?.total || "0");
        const limit = parseFloat(activeBudget.amount);
        const remaining = limit - totalSpent;

        // 4. Check Limit
        if (amount > remaining) {
            return {
                status: "EXCEEDED",
                remaining,
                totalSpent,
                limit
            };
        }

        return {
            status: "OK",
            remaining,
            totalSpent,
            limit
        };
    }

    /**
     * Dashboard Helper: Get utilization %
     */
    static async getBudgetUtilization(categoryName: string) {
        const check = await this.checkBudget(categoryName, 0, new Date());
        if (check.status === "NO_BUDGET") return null;

        const percentage = (check.totalSpent / check.limit) * 100;
        return {
            ...check,
            percentage: Math.min(percentage, 100).toFixed(1)
        };
    }
}
