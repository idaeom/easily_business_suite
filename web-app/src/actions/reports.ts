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
    const { getAuthenticatedUser, verifyPermission } = await import("@/lib/auth");
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    await verifyPermission("VIEW_REPORTS");

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

export async function getExpensesList(
    page: number = 1,
    limit: number = 10,
    search?: string,
    category?: string,
    startDate?: Date,
    endDate?: Date
) {
    const db = await getDb();
    const { expenses, users } = await import("@/db/schema");
    const { ilike, or, count } = await import("drizzle-orm");

    const offset = (page - 1) * limit;

    const whereClause = [];
    if (startDate) whereClause.push(gte(expenses.incurredAt, startDate));
    if (endDate) whereClause.push(lte(expenses.incurredAt, endDate));
    if (category && category !== "all") whereClause.push(eq(expenses.category, category));
    if (search) {
        whereClause.push(or(
            ilike(expenses.description, `%${search}%`),
            ilike(expenses.payee, `%${search}%`)
        ));
    }

    // Get Total Count
    const totalResult = await db
        .select({ count: count() })
        .from(expenses)
        .where(and(...whereClause));

    const total = totalResult[0].count;

    // Get Data
    const data = await db.query.expenses.findMany({
        where: and(...whereClause),
        with: {
            requester: true,
            approver: true
        },
        orderBy: [desc(expenses.incurredAt)],
        limit,
        offset
    });

    return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
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
    const { getAuthenticatedUser, verifyPermission } = await import("@/lib/auth");
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    await verifyPermission("VIEW_PAYROLL"); // Or VIEW_REPORTS? Using VIEW_PAYROLL for separation.

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
    const { getAuthenticatedUser, verifyPermission } = await import("@/lib/auth");
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    await verifyPermission("VIEW_FINANCE");

    const db = await getDb();
    const { accounts, ledgerEntries, transactions } = await import("@/db/schema");
    const { eq, and, gte, lte, sql } = await import("drizzle-orm");

    // 1. Fetch All Accounts
    const allAccounts = await db.query.accounts.findMany({
        orderBy: [accounts.code]
    });

    // 2. Helper to fetch aggregated stats with custom date filter
    const getStats = async (start: Date | undefined, end: Date | undefined) => {
        const dateConditions = [];
        if (start) dateConditions.push(gte(transactions.date, start));
        if (end) dateConditions.push(lte(transactions.date, end));

        // Ensure we only look at POSTED transactions
        dateConditions.push(eq(transactions.status, "POSTED"));

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

    // 4. Structure Definitions
    const profitAndLoss = {
        revenue: [] as any[],
        cogs: [] as any[],
        operatingExpenses: [] as any[],

        totalRevenue: 0,
        totalCogs: 0,
        grossProfit: 0,
        totalOperatingExpenses: 0,
        netOperatingIncome: 0,
        netProfit: 0 // (Same as NOI if no other income/tax logic yet)
    };

    const balanceSheet = {
        assets: {
            current: [] as any[],
            fixed: [] as any[],
            totalCurrent: 0,
            totalFixed: 0,
            total: 0
        },
        liabilities: {
            current: [] as any[],
            longTerm: [] as any[],
            totalCurrent: 0,
            totalLongTerm: 0,
            total: 0
        },
        equity: [] as any[],
        totalEquity: 0
    };

    // 5. Categorize Accounts
    for (const acc of allAccounts) {
        const codeStart = parseInt(acc.code);

        // --- PROFIT & LOSS (Income + Expense Types) ---
        if (["INCOME", "EXPENSE"].includes(acc.type)) {
            const stats = pnlStats.get(acc.id);
            const debits = Number(stats?.totalDebits || 0);
            const credits = Number(stats?.totalCredits || 0);

            // Determine Balance based on Normal Balance Side
            // Revenue (Income): Credit - Debit (Normally Credit)
            // Expense: Debit - Credit (Normally Debit)

            let balance = 0;
            if (acc.type === "INCOME") {
                balance = credits - debits; // Positive means we made money
            } else {
                balance = debits - credits; // Positive means we spent money
            }

            if (balance !== 0) {
                const item = { id: acc.id, name: acc.name, code: acc.code, amount: balance };

                // Grouping Logic
                // Revenue: 4000-4999
                if (codeStart >= 4000 && codeStart <= 4999) {
                    profitAndLoss.revenue.push(item);
                    profitAndLoss.totalRevenue += balance;
                }
                // COGS: 5000-5999
                else if (codeStart >= 5000 && codeStart <= 5999) {
                    profitAndLoss.cogs.push(item);
                    profitAndLoss.totalCogs += balance;
                }
                // Operating Expenses: 6000-8999
                else if (codeStart >= 6000 && codeStart <= 8999) {
                    profitAndLoss.operatingExpenses.push(item);
                    profitAndLoss.totalOperatingExpenses += balance;
                }
                // Fallback (e.g. Uncategorized Expense)
                else {
                    profitAndLoss.operatingExpenses.push(item);
                    profitAndLoss.totalOperatingExpenses += balance;
                }
            }
        }

        // --- BALANCE SHEET (Asset, Liability, Equity Types) ---
        else {
            const stats = bsStats.get(acc.id);
            const debits = Number(stats?.totalDebits || 0);
            const credits = Number(stats?.totalCredits || 0);

            let balance = 0;

            if (acc.type === "ASSET") {
                balance = debits - credits; // Debit Normal
                if (balance !== 0) {
                    const item = { id: acc.id, name: acc.name, code: acc.code, amount: balance };
                    // Current Assets: 1000 - 1499
                    if (codeStart >= 1000 && codeStart <= 1499) {
                        balanceSheet.assets.current.push(item);
                        balanceSheet.assets.totalCurrent += balance;
                    }
                    // Fixed Assets: 1500 - 1999
                    else {
                        balanceSheet.assets.fixed.push(item);
                        balanceSheet.assets.totalFixed += balance;
                    }
                    balanceSheet.assets.total += balance;
                }
            }
            else if (acc.type === "LIABILITY") {
                balance = credits - debits; // Credit Normal
                if (balance !== 0) {
                    const item = { id: acc.id, name: acc.name, code: acc.code, amount: balance };
                    // Current Liabilities: 2000 - 2499
                    if (codeStart >= 2000 && codeStart <= 2499) {
                        balanceSheet.liabilities.current.push(item);
                        balanceSheet.liabilities.totalCurrent += balance;
                    }
                    // Long Term: 2500+
                    else {
                        balanceSheet.liabilities.longTerm.push(item);
                        balanceSheet.liabilities.totalLongTerm += balance;
                    }
                    balanceSheet.liabilities.total += balance;
                }
            }
            else if (acc.type === "EQUITY") {
                balance = credits - debits; // Credit Normal
                if (balance !== 0) {
                    balanceSheet.equity.push({ id: acc.id, name: acc.name, code: acc.code, amount: balance });
                    balanceSheet.totalEquity += balance;
                }
            }
        }
    }

    // 6. Calculated Metrics
    profitAndLoss.grossProfit = profitAndLoss.totalRevenue - profitAndLoss.totalCogs;
    profitAndLoss.netOperatingIncome = profitAndLoss.grossProfit - profitAndLoss.totalOperatingExpenses;
    profitAndLoss.netProfit = profitAndLoss.netOperatingIncome; // Simplified for now

    // 7. Inject Net Profit into Equity (Retained Earnings)
    // We display it as a separate line in equity section for balance
    if (profitAndLoss.netProfit !== 0) {
        balanceSheet.equity.push({
            id: "CALC_NET_PROFIT",
            name: "Net Profit (Current Period)",
            code: "3999",
            amount: profitAndLoss.netProfit
        });
        balanceSheet.totalEquity += profitAndLoss.netProfit;
    }

    return {
        profitAndLoss,
        balanceSheet
    };
}
