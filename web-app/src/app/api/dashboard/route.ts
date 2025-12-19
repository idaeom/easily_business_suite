import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { accounts, tasks, expenses } from "@/db/schema";
import { eq, not, count } from "drizzle-orm";

export async function GET() {
    try {
        const db = await getDb();
        const totalRevenueResult = await db.select({ balance: accounts.balance })
            .from(accounts)
            .where(eq(accounts.type, "INCOME"))
            .limit(1);

        const totalRevenue = totalRevenueResult[0];

        let revenue = 0;
        if (totalRevenue) {
            revenue = Number(totalRevenue.balance);
        }

        const activeTasksResult = await db.select({ count: count() })
            .from(tasks)
            .where(not(eq(tasks.status, "DONE")));
        const activeTasks = activeTasksResult[0]?.count ?? 0;

        const pendingExpensesResult = await db.select({ count: count() })
            .from(expenses)
            .where(eq(expenses.status, "PENDING"));
        const pendingExpenses = pendingExpensesResult[0]?.count ?? 0;

        const completedTasksResult = await db.select({ count: count() })
            .from(tasks)
            .where(eq(tasks.status, "DONE"));
        const completedTasks = completedTasksResult[0]?.count ?? 0;

        return NextResponse.json({
            revenue,
            activeTasks,
            pendingExpenses,
            completedTasks
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch dashboard metrics" }, { status: 500 });
    }
}
