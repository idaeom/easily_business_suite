"use server";

import { getDb } from "@/db";
import { expenses, expenseCategories, tasks } from "@/db/schema";
import { sql, eq, and, gte, lte } from "drizzle-orm";
import { format } from "date-fns";

export async function getExpenseReports(
    startDate?: Date,
    endDate?: Date,
    categoryFilter?: string
) {
    const db = await getDb();

    // Build Where Clause
    const whereClause = [];
    if (startDate) whereClause.push(gte(expenses.incurredAt, startDate));
    if (endDate) whereClause.push(lte(expenses.incurredAt, endDate));
    if (categoryFilter && categoryFilter !== "all") {
        whereClause.push(eq(expenses.category, categoryFilter));
    }

    // 1. Monthly Trend
    // Group by Month (YYYY-MM)
    const monthlyData = await db
        .select({
            month: sql<string>`TO_CHAR(${expenses.incurredAt}, 'Mon')`,
            yearMonth: sql<string>`TO_CHAR(${expenses.incurredAt}, 'YYYY-MM')`,
            total: sql<number>`SUM(${expenses.amount})`,
        })
        .from(expenses)
        .where(and(...whereClause))
        .groupBy(sql`TO_CHAR(${expenses.incurredAt}, 'Mon')`, sql`TO_CHAR(${expenses.incurredAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${expenses.incurredAt}, 'YYYY-MM')`);

    // Format for Recharts
    const monthlyChartData = monthlyData.map(d => ({
        name: d.month,
        total: Number(d.total)
    }));

    // 2. Category Breakdown
    const categoryData = await db
        .select({
            name: expenses.category,
            value: sql<number>`SUM(${expenses.amount})`,
        })
        .from(expenses)
        .where(and(...whereClause))
        .groupBy(expenses.category);

    // Format for Pie Chart
    const categoryChartData = categoryData.map(d => ({
        name: d.name || "Uncategorized",
        value: Number(d.value)
    }));

    return {
        monthlyChartData,
        categoryChartData
    };
}

export async function getTaskReports(
    startDate?: Date,
    endDate?: Date
) {
    const db = await getDb();

    // Build Where Clause
    const whereClause = [];
    if (startDate) whereClause.push(gte(tasks.createdAt, startDate));
    if (endDate) whereClause.push(lte(tasks.createdAt, endDate));

    // 1. Status Breakdown
    const statusData = await db
        .select({
            status: tasks.status,
            count: sql<number>`COUNT(*)`,
        })
        .from(tasks)
        .where(and(...whereClause))
        .groupBy(tasks.status);

    const statusChartData = statusData.map(d => ({
        name: d.status,
        value: Number(d.count)
    }));

    // 2. Monthly Creation Trend
    const monthlyData = await db
        .select({
            month: sql<string>`TO_CHAR(${tasks.createdAt}, 'Mon')`,
            yearMonth: sql<string>`TO_CHAR(${tasks.createdAt}, 'YYYY-MM')`,
            count: sql<number>`COUNT(*)`,
        })
        .from(tasks)
        .where(and(...whereClause))
        .groupBy(sql`TO_CHAR(${tasks.createdAt}, 'Mon')`, sql`TO_CHAR(${tasks.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${tasks.createdAt}, 'YYYY-MM')`);

    const monthlyChartData = monthlyData.map(d => ({
        name: d.month,
        count: Number(d.count)
    }));

    return {
        statusChartData,
        monthlyChartData
    };
}

export async function getAccountReports(
    startDate?: Date,
    endDate?: Date
) {
    const db = await getDb();
    const { accounts, ledgerEntries } = await import("@/db/schema");

    // Build Where Clause for Period Activity
    const whereClause = [];
    if (startDate) whereClause.push(gte(ledgerEntries.transactionId, "")); // Placeholder to trigger join if needed but we filter entries directly
    // Actually we filter on transaction Date? Ledger entry doesn't have date. Transaction does.
    // We need to join transactions.

    // Let's rely on a join query.
    // Fetch all accounts first or aggregate ledgers.
    const allAccounts = await db.select().from(accounts).orderBy(accounts.code);

    // Aggregate Ledger Entries by Account within Date Range
    // We need to join with transactions to filter by date.
    // Drizzle doesn't support complex joins in `query` builder easily for aggregation, use `select`.

    /*
    SELECT
        account_id,
        SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) as total_credits
    FROM ledger_entries
    JOIN transactions ON ledger_entries.transaction_id = transactions.id
    WHERE transactions.date >= ? AND transactions.date <= ?
    GROUP BY account_id
    */

    const { transactions } = await import("@/db/schema");

    const dateConditions = [];
    if (startDate) dateConditions.push(gte(transactions.date, startDate));
    if (endDate) dateConditions.push(lte(transactions.date, endDate));

    const periodStats = await db
        .select({
            accountId: ledgerEntries.accountId,
            totalDebits: sql<number>`SUM(CASE WHEN ${ledgerEntries.direction} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE 0 END)`,
            totalCredits: sql<number>`SUM(CASE WHEN ${ledgerEntries.direction} = 'CREDIT' THEN ${ledgerEntries.amount} ELSE 0 END)`,
        })
        .from(ledgerEntries)
        .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
        .where(and(...dateConditions))
        .groupBy(ledgerEntries.accountId);

    // Map stats to accounts
    const accountStatsObj = new Map(periodStats.map(s => [s.accountId, s]));

    const reportData = allAccounts.map(acc => {
        const stats = accountStatsObj.get(acc.id);
        const debits = Number(stats?.totalDebits || 0);
        const credits = Number(stats?.totalCredits || 0);
        return {
            id: acc.id,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            debits,
            credits,
            netChange: debits - credits // Simplification: Positive = Net Debit
        };
    });

    return reportData;
}
