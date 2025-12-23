"use server";

import { getDb } from "@/db";
import { expenses, expenseCategories, tasks } from "@/db/schema";
import { sql, eq, and, gte, lte, desc } from "drizzle-orm";
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

export async function getPayrollReports(
    startDate?: Date,
    endDate?: Date
) {
    const db = await getDb();
    const { payrollRuns, payrollItems, users, employeeProfiles } = await import("@/db/schema");

    // Build Where Clause
    const whereClause = [];
    // Filter by run YEAR/MONTH or just general date range if we had a date field.
    // Ideally we filter by created_at of the run or expenses.
    // Using createdAt for now.
    if (startDate) whereClause.push(gte(payrollRuns.createdAt, startDate));
    if (endDate) whereClause.push(lte(payrollRuns.createdAt, endDate));
    // Only show finalized runs for reports? Or all? Let's show APPROVED/PAID.
    whereClause.push(sql`${payrollRuns.status} IN ('APPROVED', 'PAID')`);

    // 1. Payroll Summary
    const runs = await db.query.payrollRuns.findMany({
        where: and(...whereClause),
        with: {
            items: {
                with: {
                    user: true
                }
            }
        },
        orderBy: [desc(payrollRuns.year), desc(payrollRuns.month)]
    });

    let totalGross = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalPension = 0;

    const employeeBreakdown: any[] = [];
    const taxSchedule: any[] = [];

    for (const run of runs) {
        for (const item of run.items) {
            const gross = Number(item.grossPay);
            const net = Number(item.netPay);
            const breakdown = item.breakdown as any;
            const tax = breakdown.tax?.paye || 0;
            const pension = (breakdown.deductions?.pension || 0) + (breakdown.employerContribution?.pension || 0);

            totalGross += gross;
            totalNet += net;
            totalTax += tax;
            totalPension += pension;

            // Aggregation by Employee (Simple list for now, ideally grouped)
            employeeBreakdown.push({
                run: `${run.month}/${run.year}`,
                employee: item.user.name,
                gross,
                net,
                tax,
                pension
            });

            // Tax Schedule Entry
            if (tax > 0) {
                taxSchedule.push({
                    tin: "N/A", // Need to fetch from profile
                    name: item.user.name,
                    gross_income: gross,
                    tax_payable: tax,
                    period: `${run.month}/${run.year}`
                });
            }
        }
    }

    return {
        summary: {
            totalGross,
            totalNet,
            totalTax,
            totalPension,
            runCount: runs.length
        },
        employeeBreakdown,
        taxSchedule
    };
}

export async function getFinancialStatements(
    startDate?: Date,
    endDate: Date = new Date()
) {
    const db = await getDb();
    const { accounts, ledgerEntries, transactions } = await import("@/db/schema");

    // 1. Fetch All Accounts
    const allAccounts = await db.query.accounts.findMany();

    // 2. Helper to fetch aggregated stats with custom date filter
    const getStats = async (start: Date | undefined, end: Date | undefined) => {
        const dateConditions = [];
        if (start) dateConditions.push(gte(transactions.date, start));
        if (end) dateConditions.push(lte(transactions.date, end));

        const stats = await db
            .select({
                accountId: ledgerEntries.accountId,
                totalDebits: sql<number>`SUM(CASE WHEN ${ledgerEntries.direction} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE 0 END)`,
                totalCredits: sql<number>`SUM(CASE WHEN ${ledgerEntries.direction} = 'CREDIT' THEN ${ledgerEntries.amount} ELSE 0 END)`,
            })
            .from(ledgerEntries)
            .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
            .where(and(...dateConditions))
            .groupBy(ledgerEntries.accountId);

        return new Map(stats.map(s => [s.accountId, s]));
    };

    // 3. Fetch Stats
    // P&L: Strict Period (startDate -> endDate)
    const pnlStats = await getStats(startDate, endDate);

    // Balance Sheet: Cumulative (Everything -> endDate)
    const bsStats = await getStats(undefined, endDate);

    const balanceSheet = {
        assets: [] as any[],
        liabilities: [] as any[],
        equity: [] as any[],
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0
    };

    const profitAndLoss = {
        income: [] as any[],
        expenses: [] as any[],
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0
    };

    for (const acc of allAccounts) {
        // P&L Logic
        if (acc.type === "INCOME" || acc.type === "EXPENSE") {
            const stats = pnlStats.get(acc.id);
            const debits = Number(stats?.totalDebits || 0);
            const credits = Number(stats?.totalCredits || 0);
            // Net Balance for Period
            // Asset/Expense: Debit +, Credit -
            // Liability/Income/Equity: Credit +, Debit -

            let balance = 0;
            if (acc.type === "INCOME") {
                // Credit is positive for Income usually
                balance = credits - debits;
                if (balance !== 0) {
                    profitAndLoss.income.push({ id: acc.id, name: acc.name, amount: Math.abs(balance) });
                    profitAndLoss.totalIncome += Math.abs(balance);
                }
            } else {
                // Expense: Debit is positive
                balance = debits - credits;
                if (balance !== 0) {
                    profitAndLoss.expenses.push({ id: acc.id, name: acc.name, amount: balance });
                    profitAndLoss.totalExpenses += balance;
                }
            }
        }

        // Balance Sheet Logic
        else {
            const stats = bsStats.get(acc.id);
            const debits = Number(stats?.totalDebits || 0);
            const credits = Number(stats?.totalCredits || 0);

            let balance = 0;
            if (acc.type === "ASSET") {
                balance = debits - credits;
                if (balance !== 0) {
                    balanceSheet.assets.push({ id: acc.id, name: acc.name, amount: balance });
                    balanceSheet.totalAssets += balance;
                }
            } else if (acc.type === "LIABILITY") {
                balance = credits - debits;
                if (balance !== 0) {
                    balanceSheet.liabilities.push({ id: acc.id, name: acc.name, amount: Math.abs(balance) });
                    balanceSheet.totalLiabilities += Math.abs(balance);
                }
            } else if (acc.type === "EQUITY") {
                balance = credits - debits;
                if (balance !== 0) {
                    balanceSheet.equity.push({ id: acc.id, name: acc.name, amount: Math.abs(balance) });
                    balanceSheet.totalEquity += Math.abs(balance);
                }
            }
        }
    }

    // Dynamic Net Profit Calculation
    profitAndLoss.netProfit = profitAndLoss.totalIncome - profitAndLoss.totalExpenses;

    // Optional: Add Current Net Profit to Equity for the BS balancing?
    // Users often expect Assets = Liab + Equity.
    // If we only show Equity accounts, they won't sum up if we don't include Retained Earnings (Net Profit).
    // Let's add it as a virtual "Current Earnings" line in Equity
    /*
    if (profitAndLoss.netProfit !== 0) {
        balanceSheet.equity.push({ id: "virtual-pnl", name: "Current Net Profit", amount: profitAndLoss.netProfit });
        balanceSheet.totalEquity += profitAndLoss.netProfit;
    }
    */
    // Leaving commented out for now unless requested, as simple BS view might be preferred.

    return {
        balanceSheet,
        profitAndLoss
    };
}
