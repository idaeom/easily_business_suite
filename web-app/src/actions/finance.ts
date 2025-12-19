"use server";

import { getDb } from "@/db";
import { transactions, ledgerEntries, accounts } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { desc, eq, sql, and } from "drizzle-orm";
import { TestConfig } from "@/lib/test-config";

type JournalEntryLine = {
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
};

export async function createJournalEntry(data: {
    date: Date;
    description: string;
    reference?: string;
    lines: JournalEntryLine[];
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // RBAC: Only Admin or users with FINANCE_CREATE permission
    const hasPermission = user.role === "ADMIN" || (user.permissions as string[])?.includes("FINANCE_CREATE");
    if (!hasPermission) throw new Error("Unauthorized: Insufficient permissions");

    const db = await getDb();

    // 1. Validate Balance
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
    }

    if (totalDebit === 0) {
        throw new Error("Journal entry cannot be zero.");
    }

    // 2. Create Transaction
    const [transaction] = await db.insert(transactions).values({
        date: data.date,
        description: data.description,
        reference: data.reference,
        status: "POSTED",
        metadata: { createdBy: user.id, type: "MANUAL_JOURNAL" },
    }).returning();

    // 3. Create Ledger Entries
    for (const line of data.lines) {
        if (line.debit > 0) {
            await db.insert(ledgerEntries).values({
                transactionId: transaction.id,
                accountId: line.accountId,
                amount: line.debit.toString(),
                direction: "DEBIT",
                description: line.description || data.description,
            });
        }
        if (line.credit > 0) {
            await db.insert(ledgerEntries).values({
                transactionId: transaction.id,
                accountId: line.accountId,
                amount: line.credit.toString(),
                direction: "CREDIT",
                description: line.description || data.description,
            });
        }
    }

    // 4. Update Account Balances (Simplified - in real app, balances are derived or updated via triggers)
    // For now, we assume balances are derived from ledger entries or updated here.
    // Let's update balances for simplicity.
    for (const line of data.lines) {
        const account = await db.query.accounts.findFirst({ where: eq(accounts.id, line.accountId) });
        if (account) {
            let newBalance = Number(account.balance);
            // Asset/Expense: Debit increases, Credit decreases
            // Liability/Equity/Income: Credit increases, Debit decreases
            const isDebitNormal = ["ASSET", "EXPENSE"].includes(account.type);

            if (isDebitNormal) {
                newBalance += (line.debit - line.credit);
            } else {
                newBalance += (line.credit - line.debit);
            }

            await db.update(accounts)
                .set({ balance: newBalance.toString() })
                .where(eq(accounts.id, line.accountId));
        }
    }

    revalidatePath("/dashboard/finance");
    return { success: true, transactionId: transaction.id };
}

export async function getTransactions(page = 1, limit = 50) {
    const db = await getDb();
    const offset = (page - 1) * limit;

    const data = await db.query.transactions.findMany({
        orderBy: [desc(transactions.date)],
        limit: limit,
        offset: offset,
        with: {
            entries: {
                with: {
                    account: true
                }
            }
        }
    });

    return { data };
}

export async function getIncomeMetrics() {
    const db = await getDb();

    // Get all INCOME accounts
    const incomeAccounts = await db.query.accounts.findMany({
        where: eq(accounts.type, "INCOME")
    });

    const incomeAccountIds = incomeAccounts.map(a => a.id);
    if (incomeAccountIds.length === 0) return { totalIncome: 0, chartData: [] };

    // Calculate total income (Sum of Credits - Sum of Debits for Income accounts)
    const totalIncome = incomeAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // Fetch ledger entries for these accounts to build the chart
    const entries = await db.query.ledgerEntries.findMany({
        where: (entries, { inArray }) => inArray(entries.accountId, incomeAccountIds),
        with: {
            transaction: true
        }
    });

    // Aggregate by Month
    const monthlyData = new Map<string, number>();

    for (const entry of entries) {
        if (!entry.transaction) continue;
        const date = new Date(entry.transaction.date);
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g., "Dec 2025"

        const amount = Math.abs(Number(entry.amount));
        const current = monthlyData.get(monthKey) || 0;

        // Income: Credit is increase (+), Debit is decrease (-)
        if (entry.direction === "CREDIT") {
            monthlyData.set(monthKey, current + amount);
        } else {
            monthlyData.set(monthKey, current - amount);
        }
    }

    // Convert to array and sort chronologically
    const chartData = Array.from(monthlyData.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { totalIncome: Math.abs(totalIncome), chartData };
}

export async function getAllProviderBalances() {
    const db = await getDb();
    // Find accounts that are external providers (e.g. have a provider field)
    // Or just return specific known provider accounts
    // For now, let's return all ASSET accounts that are marked as external or have a provider
    const providerAccounts = await db.query.accounts.findMany({
        where: and(eq(accounts.type, "ASSET"), sql`${accounts.provider} IS NOT NULL`)
    });

    return providerAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        provider: acc.provider,
        balance: Number(acc.balance)
    }));
}

export async function getAccountBalancesByType(type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE") {
    const db = await getDb();
    const data = await db.query.accounts.findMany({
        where: eq(accounts.type, type)
    });

    return data.map(acc => ({
        ...acc,
        balance: Number(acc.balance)
    }));
}

export async function getAccounts() {
    const db = await getDb();
    return await db.query.accounts.findMany();
}

export async function createDedicatedAccountAction(provider: string, accountId: string) {
    const user = await getAuthenticatedUser();
    if (user?.role !== "ADMIN") throw new Error("Unauthorized");

    // Placeholder for creating a dedicated virtual account
    console.log(`Creating dedicated account for ${accountId} on ${provider}`);
    const db = await getDb();

    // Simulate success
    await db.update(accounts).set({
        bankName: "Wema Bank",
        accountNumber: "1234567890",
        provider: provider
    }).where(eq(accounts.id, accountId));

    revalidatePath("/dashboard/finance");
}

export async function simulateInflowAction(accountId: string, amount: number) {
    const user = await getAuthenticatedUser();
    // STRICT: Only Admin can simulate money!
    if (user?.role !== "ADMIN") throw new Error("Unauthorized: Only Admins can simulate inflows");

    const db = await getDb();
    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) });
    if (!account) throw new Error("Account not found");

    // Create a transaction
    const [tx] = await db.insert(transactions).values({
        description: "Simulated Inflow",
        reference: `SIM-${Date.now()}`,
        status: "POSTED",
        metadata: { type: "INFLOW" }
    }).returning();

    // Debit the account (Asset increases with Debit)
    await db.insert(ledgerEntries).values({
        transactionId: tx.id,
        accountId: accountId,
        amount: amount.toString(),
        direction: "DEBIT",
        description: "Simulated Inflow"
    });

    // We need a balancing entry. Let's credit "Sales Revenue" or similar if exists, or just leave it unbalanced for simulation?
    // Better to balance it. Let's find an Income account.
    const incomeAccount = await db.query.accounts.findFirst({ where: eq(accounts.type, "INCOME") });
    if (incomeAccount) {
        await db.insert(ledgerEntries).values({
            transactionId: tx.id,
            accountId: incomeAccount.id,
            amount: amount.toString(),
            direction: "CREDIT",
            description: "Simulated Inflow Source"
        });

        // Update Income Balance
        await db.update(accounts)
            .set({ balance: (Number(incomeAccount.balance) + amount).toString() })
            .where(eq(accounts.id, incomeAccount.id));
    }

    // Update Asset Balance
    await db.update(accounts)
        .set({ balance: (Number(account.balance) + amount).toString() })
        .where(eq(accounts.id, accountId));

    revalidatePath("/dashboard/finance");
}
