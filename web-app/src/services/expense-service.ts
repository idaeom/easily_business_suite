import { getDb } from "@/db";
import { expenses, expenseCategories, accounts } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";
import { FinanceService } from "./finance-service";

export class ExpenseService {

    static async getCategories() {
        const db = await getDb();
        return await db.select().from(expenseCategories);
    }

    static async createCategory(name: string, description?: string) {
        const db = await getDb();
        const [cat] = await db.insert(expenseCategories).values({
            name,
            description
        }).returning();
        return cat;
    }

    static async createExpense(data: {
        description: string;
        amount: number;
        categoryId: string;
        payee: string;
        date?: Date;
    }, userId: string) {
        const db = await getDb();

        const [expense] = await db.insert(expenses).values({
            description: data.description,
            amount: data.amount.toString(),
            category: data.categoryId, // Note: schema has 'category' column related to expenseCategories.id
            payee: data.payee,
            requesterId: userId,
            incurredAt: data.date || new Date(),
            status: "PENDING"
        }).returning();

        return expense;
    }

    static async approveExpense(expenseId: string, userId: string) {
        const db = await getDb();
        await db.update(expenses)
            .set({ status: "APPROVED", approverId: userId })
            .where(eq(expenses.id, expenseId));
    }

    static async processPayment(expenseId: string, sourceAccountId: string, userId: string) {
        const db = await getDb();

        const expense = await db.query.expenses.findFirst({
            where: eq(expenses.id, expenseId),
            with: { expenseCategory: true } // Relation definition in schema? 'expenseCategory' relation?
        });

        if (!expense) throw new Error("Expense not found");
        if (expense.status === "DISBURSED") throw new Error("Expense already paid");

        // 1. Update Status
        await db.update(expenses)
            .set({
                status: "DISBURSED",
                sourceAccountId: sourceAccountId
            })
            .where(eq(expenses.id, expenseId));

        // 2. GL Posting
        // Find Expense Account (mapped to Category or Generic)
        // Ideally Category has a generic link, but schema for ExpenseCategory doesn't show glAccountId (checked schema line 42).
        // So we look for an account named after the category OR generic Expense.

        let expenseGlAccount = await db.query.accounts.findFirst({
            where: (a) => and(eq(a.type, "EXPENSE"), like(a.name, `%${expense.expenseCategory?.name || "Expense"}%`))
        });

        if (!expenseGlAccount) {
            // Fallback
            expenseGlAccount = await db.query.accounts.findFirst({ where: eq(accounts.type, "EXPENSE") });
        }

        if (expenseGlAccount && sourceAccountId) {
            await FinanceService.createJournalEntry({
                date: new Date(),
                description: `Expense Payment: ${expense.description} (${expense.payee})`,
                entries: [
                    {
                        accountId: expenseGlAccount.id,
                        debit: Number(expense.amount),
                        credit: 0,
                        description: `Expense: ${expense.description}`
                    },
                    {
                        accountId: sourceAccountId,
                        debit: 0,
                        credit: Number(expense.amount),
                        description: "Payment Source"
                    }
                ]
            }, userId); // Assuming userId is passed for tracking (createJournalEntry adjusted args?)
            // update: createJournalEntry(data, userId)
        }
    }
}
