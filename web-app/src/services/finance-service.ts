import { getDb } from "@/db";
import { businessAccounts, accounts, transactions, ledgerEntries } from "@/db/schema";
import { eq, desc, and, sql, isNotNull, like } from "drizzle-orm";
import { CreateBusinessAccountDto, UpdateBusinessAccountDto, CreateJournalEntryDto } from "@/lib/dtos/finance-dtos";

export class FinanceService {

    static async getBusinessAccounts() {
        const db = await getDb();
        return await db.query.businessAccounts.findMany({
            with: { glAccount: true },
            orderBy: [desc(businessAccounts.createdAt)]
        });
    }

    static async createBusinessAccount(data: CreateBusinessAccountDto) {
        const db = await getDb();

        const existingLink = await db.query.businessAccounts.findFirst({
            where: eq(businessAccounts.glAccountId, data.glAccountId)
        });

        let finalGlAccountId = data.glAccountId;

        if (existingLink) {
            const templateGl = await db.query.accounts.findFirst({
                where: eq(accounts.id, data.glAccountId)
            });

            if (templateGl) {
                const newCode = `${templateGl.code}-${Math.floor(Math.random() * 1000)}`;
                const [newGl] = await db.insert(accounts).values({
                    name: `${data.name} (${templateGl.name})`,
                    code: newCode,
                    type: templateGl.type,
                    description: `Dedicated account for ${data.name}`,
                    isExternal: false,
                    bankName: data.name
                }).returning();
                finalGlAccountId = newGl.id;
            }
        }

        await db.insert(businessAccounts).values({
            ...data,
            glAccountId: finalGlAccountId,
            createdAt: new Date()
        });

        if (data.openingBalance && data.openingBalance > 0) {
            let equity = await db.query.accounts.findFirst({ where: eq(accounts.code, "3000") });

            if (!equity) {
                // Self-call logic or internal logic? 
                // Better to use internal utility or assume exists/create.
                // Keeping it simple for service layer.
                const [newEquity] = await db.insert(accounts).values({
                    name: "Owner's Capital",
                    code: "3000",
                    type: "EQUITY",
                    description: "Capital injection by owners",
                    isExternal: false
                }).returning();
                equity = newEquity;
            }

            await this.createJournalEntry({
                description: `Opening Balance - ${data.name}`,
                date: new Date(),
                entries: [
                    {
                        accountId: finalGlAccountId,
                        debit: data.openingBalance,
                        credit: 0,
                        description: "Opening Balance"
                    },
                    {
                        accountId: equity.id,
                        debit: 0,
                        credit: data.openingBalance,
                        description: "Capital Injection"
                    }
                ]
            }); // Note: Authorization for this internal call is implicit/system level
        }
    }

    static async updateBusinessAccount(id: string, data: UpdateBusinessAccountDto) {
        const db = await getDb();
        await db.update(businessAccounts).set({
            ...data
        }).where(eq(businessAccounts.id, id));
    }

    static async getGlAccounts() {
        const db = await getDb();
        return await db.select({
            id: accounts.id,
            name: accounts.name,
            code: accounts.code,
            type: accounts.type,
            balance: accounts.balance,
            description: accounts.description,
            currency: sql<string>`'NGN'` // Hardcode for now as per schema limitations
        }).from(accounts);
    }

    static async getAccountsByType(type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE") {
        const db = await getDb();
        return await db.query.accounts.findMany({
            where: eq(accounts.type, type),
            orderBy: [desc(accounts.balance)]
        });
    }

    // ... other getters (getTransactions, etc.) can be moved or kept in Controller if purely read-only for UI.
    // For purity, let's move getTransactions.

    static async getTransactions(page = 1, limit = 50) {
        const db = await getDb();
        const skip = (page - 1) * limit;

        const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(transactions);
        const totalItems = Number(countResult.count);

        const data = await db.query.transactions.findMany({
            orderBy: [desc(transactions.date)],
            limit: limit,
            offset: skip,
            with: {
                entries: {
                    with: { account: true }
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

    static async createJournalEntry(data: CreateJournalEntryDto, userId?: string) {
        const db = await getDb();

        // Validation (Already done by ZodDto but good for double check logic if called internally)
        const totalDebit = data.entries.reduce((sum, e) => sum + e.debit, 0);
        const totalCredit = data.entries.reduce((sum, e) => sum + e.credit, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`Transaction is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
        }

        const [tx] = await db.insert(transactions).values({
            description: data.description,
            date: data.date,
            status: "POSTED",
            metadata: { type: "MANUAL_JOURNAL", createdBy: userId }
        }).returning();

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

            await this.updateAccountBalance(entry.accountId, amount, direction);
        }
        return tx;
    }

    // Helper
    static async updateAccountBalance(accountId: string, amount: number, direction: "DEBIT" | "CREDIT") {
        const db = await getDb();
        const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) });
        if (account) {
            let change = 0;
            const isAssetExpense = ["ASSET", "EXPENSE"].includes(account.type);

            if (isAssetExpense) {
                change = direction === "DEBIT" ? amount : -amount;
            } else {
                change = direction === "CREDIT" ? amount : -amount;
            }

            // Safe Update
            await db.execute(sql`UPDATE "Account" SET balance = balance + ${change} WHERE id = ${accountId}`);
        }
    }
}
