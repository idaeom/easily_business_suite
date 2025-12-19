import { getDb } from "@/db";
import { accounts, transactions, ledgerEntries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export class FinanceService {
    /**
     * Create Account
     */
    static async createAccount(data: {
        name: string;
        code: string;
        type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
        description?: string;
        isExternal?: boolean;
    }) {
        const db = await getDb();
        const [account] = await db.insert(accounts).values({
            name: data.name,
            code: data.code,
            type: data.type,
            description: data.description,
            isExternal: data.isExternal,
            balance: "0",
        }).returning();
        return account;
    }

    /**
     * Record a Double-Entry Transaction
     * STANDARD: DEBIT IS POSITIVE (+), CREDIT IS NEGATIVE (-)
     */
    static async createTransaction(
        data: {
            description: string;
            date?: Date;
            reference?: string;
            entries: {
                accountId: string;
                amount: number;
                description?: string;
            }[];
        },
        tx?: any // We keep 'any' for now to avoid complex Drizzle type imports, but logic is robust
    ) {
        // 1. Validate Zero-Sum Rule
        // Sum of Dr (+) and Cr (-) must be 0
        const sum = data.entries.reduce((acc, entry) => acc + entry.amount, 0);

        if (Math.abs(sum) > 0.01) {
            throw new Error(`CRITICAL: Transaction unbalanced! Sum is ${sum} (Must be 0)`);
        }

        // Logic to run inside a transaction
        const runLogic = async (t: any) => {
            // 2. Create Transaction Header
            const [transaction] = await t.insert(transactions).values({
                description: data.description,
                date: data.date || new Date(),
                reference: data.reference,
                status: "POSTED",
            }).returning();

            // 3. Process Entries
            for (const entry of data.entries) {
                // Determine direction based on Standard Accounting
                const direction = entry.amount >= 0 ? "DEBIT" : "CREDIT";

                await t.insert(ledgerEntries).values({
                    transactionId: transaction.id,
                    accountId: entry.accountId,
                    amount: entry.amount.toString(),
                    direction: direction,
                    description: entry.description,
                });

                // 4. Update Balances Atomically
                await t.update(accounts)
                    .set({
                        balance: sql`${accounts.balance} + ${entry.amount}`
                    })
                    .where(eq(accounts.id, entry.accountId));
            }

            return transaction;
        };

        if (tx) {
            // Already inside a transaction, just run logic
            return runLogic(tx);
        } else {
            // Start a new one
            const db = await getDb();
            return db.transaction(async (newTx) => {
                return runLogic(newTx);
            });
        }
    }

    /**
     * Get Account Balance (Human Readable)
     * Normalizes the sign based on Account Type.
     */
    static async getAccountBalance(accountId: string) {
        const db = await getDb();
        const accountResult = await db.select().from(accounts).where(eq(accounts.id, accountId));
        const account = accountResult[0];

        if (!account) throw new Error("Account not found");

        const rawBalance = Number(account.balance);

        // NORMALIZE FOR UI:
        // Assets & Expenses are "Debit Normal" (Positive is Good/More).
        // Liabilities, Equity, Income are "Credit Normal" (Negative is Good/More).
        // We flip the sign for Credit Normal accounts so the UI shows positive numbers.

        let displayBalance = rawBalance;

        if (["LIABILITY", "EQUITY", "INCOME"].includes(account.type)) {
            displayBalance = rawBalance * -1;
        }

        return {
            ...account,
            rawBalance: rawBalance, // The DB value (for math)
            displayBalance: displayBalance // The UI value (e.g. Revenue of 1M shows as 1,000,000 not -1,000,000)
        };
    }
}
