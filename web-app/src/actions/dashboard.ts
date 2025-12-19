"use server";

import { getDb } from "@/db";
import { accounts, tasks, spSales, users, dispatches, inventory } from "@/db/schema";
import { sql, lt, ne, and, count, eq, gte, lte } from "drizzle-orm";

export async function getDashboardMetrics() {
    const db = await getDb();
    // RUN QUERIES IN PARALLEL (Performance Best Practice)
    const [financeMetrics, taskCounts, overdueCount] = await Promise.all([
        // 1. Finance: Sum balances by Type
        db.select({
            type: accounts.type,
            total: sql<string>`coalesce(sum(${accounts.balance}), '0')`,
        })
            .from(accounts)
            .groupBy(accounts.type),

        // 2. Tasks: Count by Status
        db.select({
            status: tasks.status,
            count: count(),
        })
            .from(tasks)
            .groupBy(tasks.status),

        // 3. Tasks: Count Overdue (Due date passed & Not Done)
        db.select({ count: count() })
            .from(tasks)
            .where(and(
                lt(tasks.dueDate, new Date()), // Date is in the past
                ne(tasks.status, "DONE")       // Status is NOT 'DONE'
            ))
    ]);

    // --- PROCESS FINANCE (Same logic as before) ---
    let revenueRaw = 0, expensesRaw = 0, assetsRaw = 0, liabilitiesRaw = 0;

    financeMetrics.forEach((m) => {
        const val = parseFloat(m.total);
        if (m.type === "INCOME") revenueRaw = val;
        else if (m.type === "EXPENSE") expensesRaw = val;
        else if (m.type === "ASSET") assetsRaw = val;
        else if (m.type === "LIABILITY") liabilitiesRaw = val;
    });

    const totalRevenue = revenueRaw * -1; // Flip Sign
    const totalExpenses = expensesRaw;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0";

    // --- PROCESS TASKS ---
    // Initialize map
    const taskMap: Record<string, number> = {
        TODO: 0,
        IN_PROGRESS: 0,
        CERTIFIED: 0,
        APPROVED: 0,
        DONE: 0
    };

    taskCounts.forEach(t => {
        if (t.status) taskMap[t.status] = t.count;
    });

    // Calculated Task Metrics
    const totalTasks = Object.values(taskMap).reduce((a, b) => a + b, 0);
    const completedTasks = taskMap.DONE;
    const activeTasks = taskMap.TODO + taskMap.IN_PROGRESS;
    const inReviewTasks = taskMap.CERTIFIED + taskMap.APPROVED;
    const overdueTasks = overdueCount[0].count;

    // Completion Rate
    const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    return {
        finance: {
            revenue: totalRevenue,
            expenses: totalExpenses,
            netProfit: netProfit,
            profitMargin: Number(profitMargin),
            isProfitable: netProfit >= 0,
        },
        tasks: {
            total: totalTasks,
            active: activeTasks,     // Needs attention
            inReview: inReviewTasks, // Waiting for manager
            completed: completedTasks,
            overdue: overdueTasks,   // Critical
            completionRate,
        }
    };
}

export async function getEnterpriseMetrics() {
    const db = await getDb();

    // Date Range: Today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
        todaysSales,
        lowStockCount,
        staffCount,
        pendingDispatches,
        finance
    ] = await Promise.all([
        // 1. Sales Today (Sum Total)
        db.select({
            total: sql<string>`coalesce(sum(${spSales.total}), '0')`,
            count: count()
        })
            .from(spSales)
            .where(
                and(
                    gte(spSales.createdAt, todayStart),
                    lte(spSales.createdAt, todayEnd)
                )
            ),

        // 2. Low Stock Items (Quantity <= MinStock)
        db.select({ count: count() })
            .from(inventory)
            .where(lte(inventory.quantity, sql`${inventory.minStockLevel}`)),

        // 3. Total Staff
        db.select({ count: count() }).from(users),

        // 4. Pending Dispatches
        db.select({ count: count() })
            .from(dispatches)
            .where(eq(dispatches.status, "PENDING")),

        // 5. Existing Finance/Task Metrics
        getDashboardMetrics()
    ]);

    return {
        sales: {
            todayTotal: parseFloat(todaysSales[0].total),
            todayCount: todaysSales[0].count,
        },
        inventory: {
            lowStock: lowStockCount[0].count,
        },
        hr: {
            totalStaff: staffCount[0].count,
        },
        operations: {
            pendingDispatches: pendingDispatches[0].count,
        },
        finance: finance.finance,
        tasks: finance.tasks
    };
}
