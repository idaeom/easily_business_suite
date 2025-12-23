"use server";

import { businessAccounts, accounts, transactions, ledgerEntries } from "@/db/schema";
import { eq, desc, and, sql, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ==========================================
// BUSINESS ACCOUNT MANAGEMENT (NEW)
// ==========================================

export type BusinessAccountInput = {
    name: string;
    type: "CASH" | "BANK" | "MOMO";
    usage: string[]; // ["REVENUE_COLLECTION", "WALLET_FUNDING", "EXPENSE_PAYOUT"]
    glAccountId: string;
    isEnabled: boolean;
    openingBalance?: number;
};

export async function getBusinessAccounts() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    return await db.query.businessAccounts.findMany({
        with: {
            glAccount: true
        },
        orderBy: [desc(businessAccounts.createdAt)]
    });
}

export async function createBusinessAccount(data: BusinessAccountInput) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_ACCOUNTS");

    const db = await getDb();

    // 0. Enforce Unique GL Account Logic
    // Check if this GL Account is already used by another Business Account
    const existingLink = await db.query.businessAccounts.findFirst({
        where: eq(businessAccounts.glAccountId, data.glAccountId)
    });

    let finalGlAccountId = data.glAccountId;

    if (existingLink) {
        // GL is already taken. We must create a new one to avoid "Shared Balance" issues.
        // Fetch the template GL details
        const templateGl = await db.query.accounts.findFirst({
            where: eq(accounts.id, data.glAccountId)
        });

        if (templateGl) {
            // Generate a unique code (Mock simple increment for now or random suffix)
            // Real world: logical increment (1010 -> 1011). random for safety here.
            const newCode = `${templateGl.code}-${Math.floor(Math.random() * 1000)}`;

            const [newGl] = await db.insert(accounts).values({
                name: `${data.name} (${templateGl.name})`, // e.g. "GTBank (Main Bank)"
                code: newCode,
                type: templateGl.type,
                parentAccountId: templateGl.parentAccountId,
                description: `Dedicated account for ${data.name}`,
                isExternal: false,
                bankName: data.name
            }).returning();

            finalGlAccountId = newGl.id;
        }
    }

    // 1. Create the Account Record
    const [newAccount] = await db.insert(businessAccounts).values({
        ...data,
        glAccountId: finalGlAccountId,
        createdAt: new Date(),
        updatedAt: new Date()
    }).returning();

    // 2. Handle Opening Balance (Capital Injection)
    if (data.openingBalance && data.openingBalance > 0) {
        // Reuse the logic we validated in our script
        const { FinanceService } = await import("@/lib/finance");

        // Find/Create Equity Account
        let equity = await db.query.accounts.findFirst({
            where: eq(accounts.code, "3000") // Standard Equity Code
        });

        if (!equity) {
            equity = await FinanceService.createAccount({
                name: "Owner's Capital",
                code: "3000",
                type: "EQUITY",
                description: "Capital injection by owners",
                isExternal: false
            });
        }

        // Post Transaction using Service (Ensures Double Entry & Balance Updates)
        await FinanceService.createTransaction({
            description: `Opening Balance - ${data.name}`,
            date: new Date(),
            entries: [
                {
                    accountId: finalGlAccountId, // Use the FINAL (possibly new) GL
                    amount: data.openingBalance, // Debit (+)
                    description: "Opening Balance"
                },
                {
                    accountId: equity.id, // Owner's Equity
                    amount: -data.openingBalance, // Credit (-)
                    description: "Capital Injection"
                }
            ]
        });
    }

    revalidatePath("/dashboard/business/finance/accounts");
    return { success: true };
}

export async function updateBusinessAccount(id: string, data: Partial<BusinessAccountInput>) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_ACCOUNTS");

    const db = await getDb();

    await db.update(businessAccounts).set({
        ...data,
        updatedAt: new Date()
    }).where(eq(businessAccounts.id, id));

    revalidatePath("/dashboard/business/finance/accounts");
    return { success: true };
}

export async function getGlAccounts() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    return await db.select({
        id: accounts.id,
        name: accounts.name,
        code: accounts.code,
        type: accounts.type
    }).from(accounts);
}

// Simple fetch for all accounts (Restored)
export async function getAccounts() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();
    return await db.query.accounts.findMany();
}

// ==========================================
// FINANCIAL DASHBOARD ACTIONS (RESTORED)
// ==========================================

// ==========================================
// FINANCIAL DASHBOARD ACTIONS (OPTIMIZED)
// ==========================================

export async function getTransactions(page = 1, limit = 50) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    const skip = (page - 1) * limit;

    // 1. Get Total Count (Fast Estimate or Exact)
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(transactions);
    const totalItems = Number(countResult.count);

    // 2. Fetch Transactions with Relations (Single Query)
    const data = await db.query.transactions.findMany({
        orderBy: [desc(transactions.date)],
        limit: limit,
        offset: skip,
        with: {
            entries: {
                with: {
                    account: true
                }
            }
        }
    });

    return {
        data,
        metadata: {
            currentPage: page,
            pageSize: limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit)
        }
    };
}

export async function getIncomeMetrics() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Aggregation Query: Sum CREDIT entries for INCOME accounts, grouped by Month
    // Note: We join transactions to get the date

    // 1. Get Income Account IDs first (Subquery optimization)
    // Actually, simple join filter is fine for this scale

    const metrics = await db
        .select({
            month: sql<string>`to_char(${transactions.date}, 'Mon')`, // e.g., "Jan"
            year: sql<string>`to_char(${transactions.date}, 'YYYY')`,
            total: sql<string>`sum(${ledgerEntries.amount})`, // Drizzle returns strings for decimals
        })
        .from(ledgerEntries)
        .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
        .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
        .where(and(
            eq(accounts.type, "INCOME"),
            eq(ledgerEntries.direction, "CREDIT")
        ))
        .groupBy(sql`to_char(${transactions.date}, 'Mon')`, sql`to_char(${transactions.date}, 'YYYY')`, sql`date_trunc('month', ${transactions.date})`)
        .orderBy(sql`date_trunc('month', ${transactions.date})`); // Order by actual date, not string

    // Calculate Total Lifetime Income
    const totalIncome = metrics.reduce((sum, m) => sum + Number(m.total), 0);

    // Format for Chart
    const chartData = metrics.map(m => ({
        date: `${m.month} ${m.year}`, // "Dec 2024"
        amount: Number(m.total)
    }));

    return { totalIncome, chartData };
}

export async function getAllProviderBalances() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    return await db.query.accounts.findMany({
        where: isNotNull(accounts.provider)
    });
}

export async function getAccountBalancesByType(type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE") {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    return await db.query.accounts.findMany({
        where: eq(accounts.type, type),
        orderBy: [desc(accounts.balance)]
    });
}

// Form Actions
export async function simulateInflowAction(accountId: string, amount: number) {
    const user = await getAuthenticatedUser();
    // Only Admin
    if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

    // Additional check for robust permissions
    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_ACCOUNTS");

    const db = await getDb();

    // 1. Debit Asset (Increase)
    // 2. Credit Income (Increase) - Assume generic sales or find first income
    const incomeAcc = await db.query.accounts.findFirst({ where: eq(accounts.type, "INCOME") });
    if (!incomeAcc) throw new Error("No Income account found to balance transaction");

    // Transaction
    const [tx] = await db.insert(transactions).values({
        description: "Simulated Inflow (Test)",
        status: "POSTED",
        metadata: { type: "SIMULATION" }
    }).returning();

    // Debit Asset
    await db.insert(ledgerEntries).values({
        transactionId: tx.id,
        accountId: accountId,
        direction: "DEBIT",
        amount: amount.toString(),
        description: "Simulated Funding"
    });

    // Credit Income
    await db.insert(ledgerEntries).values({
        transactionId: tx.id,
        accountId: incomeAcc.id,
        direction: "CREDIT",
        amount: amount.toString(),
        description: "Simulated Source"
    });

    // Update Balances
    // Asset +
    await db.execute(sql`UPDATE "Account" SET balance = balance + ${amount} WHERE id = ${accountId}`);
    // Income - (Credit Balance increases)
    await db.execute(sql`UPDATE "Account" SET balance = balance + ${amount} WHERE id = ${incomeAcc.id}`);

    revalidatePath("/dashboard/finance");
}

export async function createDedicatedAccountAction(provider: string, accountId: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_ACCOUNTS");

    const db = await getDb();

    console.log(`Simulating creating dedicated account for ${accountId} on ${provider}`);

    // Simulate API call delay
    await new Promise(r => setTimeout(r, 1000));

    await db.update(accounts).set({
        bankName: "Wema Bank",
        accountNumber: "1234567890", // Mock NUBAN
        provider: provider
    }).where(eq(accounts.id, accountId));

    revalidatePath("/dashboard/finance");
}

export type JournalEntryInput = {
    description: string;
    date: Date;
    entries: {
        accountId: string;
        debit: number;
        credit: number;
        description?: string;
    }[];
};

export async function createJournalEntry(data: JournalEntryInput) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_ACCOUNTS");

    const db = await getDb();

    // 1. Validate Balance
    const totalDebit = data.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = data.entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Transaction is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
    }

    if (totalDebit === 0) throw new Error("Transaction cannot be empty");

    // 2. Create Transaction
    const [tx] = await db.insert(transactions).values({
        description: data.description,
        date: data.date,
        status: "POSTED",
        metadata: { type: "MANUAL_JOURNAL", createdBy: user.id }
    }).returning();

    // 3. Create Entries & Update Balances
    for (const entry of data.entries) {
        const amount = entry.debit > 0 ? entry.debit : entry.credit;
        const direction = entry.debit > 0 ? "DEBIT" : "CREDIT";

        await db.insert(ledgerEntries).values({
            transactionId: tx.id,
            accountId: entry.accountId,
            amount: amount.toString(),
            direction: direction,
            description: entry.description || data.description
        });

        // Update Account Balance
        // Helper logic: Asset/Expense increase on Debit. Liability/Income/Equity increase on Credit.
        const account = await db.query.accounts.findFirst({ where: eq(accounts.id, entry.accountId) });
        if (account) {
            let change = 0;
            const isAssetExpense = ["ASSET", "EXPENSE"].includes(account.type);

            if (isAssetExpense) {
                change = direction === "DEBIT" ? amount : -amount;
            } else {
                change = direction === "CREDIT" ? amount : -amount;
            }

            // Execute SQL update to avoid race conditions (simple version)
            // Note: In production, use tighter concurrency controls
            await db.execute(sql`UPDATE "Account" SET balance = balance + ${change} WHERE id = ${entry.accountId}`);
        }
    }

    revalidatePath("/dashboard/finance");
    revalidatePath("/dashboard/finance/journals");
    return { success: true };
}
