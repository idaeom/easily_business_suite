"use server";

import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { FinanceService } from "@/services/finance-service";
import { createBusinessAccountSchema, updateBusinessAccountSchema, createJournalEntrySchema } from "@/lib/dtos/finance-dtos";

// ==========================================
// BUSINESS ACCOUNT MANAGEMENT
// ==========================================

export async function getBusinessAccounts() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    return FinanceService.getBusinessAccounts();
}

export async function createBusinessAccount(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_ACCOUNTS");

    const data = createBusinessAccountSchema.parse(rawData);
    await FinanceService.createBusinessAccount(data);

    revalidatePath("/dashboard/business/finance/accounts");
    return { success: true };
}

export async function updateBusinessAccount(id: string, rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_ACCOUNTS");

    const data = updateBusinessAccountSchema.parse(rawData);
    await FinanceService.updateBusinessAccount(id, data);

    revalidatePath("/dashboard/business/finance/accounts");
    return { success: true };
}

// ... Getters can remain or delegate ...
export async function getGlAccounts() {
    return FinanceService.getGlAccounts();
}

export const getAccounts = getGlAccounts;

// ==========================================
// FINANCIAL DASHBOARD & JOURNALS
// ==========================================

export async function getTransactions(page = 1, limit = 50) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    return FinanceService.getTransactions(page, limit);
}

export async function createJournalEntry(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_ACCOUNTS");

    const data = createJournalEntrySchema.parse(rawData);
    await FinanceService.createJournalEntry(data, user.id);

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/journals");
    return { success: true };
}

// Retaining read-only dashboard metrics in Action for now to minimize disruption, or move to Service in Phase 3.
export async function getIncomeMetrics() {
    // ... Existing implementation ...
    const { getDb } = await import("@/db");
    const { transactions, ledgerEntries, accounts } = await import("@/db/schema");
    const { sql, eq, and } = await import("drizzle-orm");
    const db = await getDb();

    const metrics = await db
        .select({
            month: sql<string>`to_char(${transactions.date}, 'Mon')`,
            year: sql<string>`to_char(${transactions.date}, 'YYYY')`,
            total: sql<string>`sum(${ledgerEntries.amount})`,
        })
        .from(ledgerEntries)
        .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
        .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
        .where(and(
            eq(accounts.type, "INCOME"),
            eq(ledgerEntries.direction, "CREDIT")
        ))
        .groupBy(sql`to_char(${transactions.date}, 'Mon')`, sql`to_char(${transactions.date}, 'YYYY')`, sql`date_trunc('month', ${transactions.date})`)
        .orderBy(sql`date_trunc('month', ${transactions.date})`);

    const totalIncome = metrics.reduce((sum, m) => sum + Number(m.total), 0);
    const chartData = metrics.map(m => ({
        date: `${m.month} ${m.year}`,
        amount: Number(m.total)
    }));

    return { totalIncome, chartData };
}

export async function getAccountBalancesByType(type: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    return FinanceService.getAccountsByType(type);
}

export async function getAllProviderBalances() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // Aggregate from provider services
    // Ideally this is dynamic, but for now we check known providers
    const { PaystackService } = await import("@/lib/paystack");

    const balances = [];

    // Paystack
    try {
        const paystackBalance = await PaystackService.getBalance();
        if (paystackBalance !== null) {
            balances.push({
                id: "paystack-main",
                name: "Paystack Main",
                provider: "Paystack",
                balance: paystackBalance
            });
        }
    } catch (e) {
        console.error("Failed to fetch paystack balance", e);
    }

    return balances;
}
