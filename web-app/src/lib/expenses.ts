import { getDb } from "@/db";
import { expenses, expenseBeneficiaries } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { AuditService } from "@/lib/audit";

export class ExpenseService {
    /**
     * Create Expense Request
     */
    static async createExpense(data: {
        description: string;
        amount: number;
        requesterId: string;
        taskId?: string;
        category?: string;
        expenseAccountId?: string;
        incurredAt?: Date;
        beneficiaries?: {
            name: string;
            bankName: string;
            bankCode: string;
            accountNumber: string;
            amount: number;
        }[];
    }) {
        const db = await getDb();
        return db.transaction(async (tx) => {
            // Extract primary beneficiary details for legacy support / main view
            const primaryBeneficiary = data.beneficiaries?.[0];

            const [expense] = await tx.insert(expenses).values({
                description: data.description,
                amount: data.amount.toString(), // Store as string for Decimal
                requesterId: data.requesterId,
                taskId: data.taskId,
                category: data.category,
                expenseAccountId: data.expenseAccountId,
                incurredAt: data.incurredAt,
                status: "PENDING",
                // Populate legacy fields for backward compatibility and DB constraints
                payee: primaryBeneficiary?.name || "Multiple Beneficiaries",
                payeeBankName: primaryBeneficiary?.bankName || "N/A",
                payeeAccountNumber: primaryBeneficiary?.accountNumber || "N/A",
            }).returning();

            if (data.beneficiaries && data.beneficiaries.length > 0) {
                const totalBeneficiaries = data.beneficiaries.reduce((sum, b) => sum + b.amount, 0);
                // Use a small epsilon for floating point safety
                if (Math.abs(totalBeneficiaries - data.amount) > 0.01) {
                    throw new Error(`Mismatch: Total amount (${data.amount}) != Sum of beneficiaries (${totalBeneficiaries})`);
                }

                for (const b of data.beneficiaries) {
                    await tx.insert(expenseBeneficiaries).values({
                        expenseId: expense.id,
                        name: b.name,
                        bankName: b.bankName,
                        bankCode: b.bankCode,
                        accountNumber: b.accountNumber,
                        amount: b.amount.toString(),
                    });
                }
            }

            await AuditService.log(data.requesterId, "CREATE_EXPENSE", "Expense", expense.id, { description: `Created expense: ${data.description}` }, tx);
            return expense;
        });
    }

    /**
     * Certify Expense
     */
    static async certifyExpense(expenseId: string, userId: string) {
        const db = await getDb();
        return db.transaction(async (tx) => {
            const [expense] = await tx.update(expenses)
                .set({ status: "CERTIFIED" })
                .where(eq(expenses.id, expenseId))
                .returning();

            await AuditService.log(userId, "CERTIFY_EXPENSE", "Expense", expenseId, { description: "Certified expense" }, tx);

            // Notify Requester
            if (expense.requesterId !== userId) {
                const { CollaborationService } = await import("@/lib/collaboration");
                await CollaborationService.createNotification({
                    userId: expense.requesterId,
                    title: "Expense Certified",
                    message: `Your expense "${expense.description}" has been certified.`
                }, tx);
            }

            return expense;
        });
    }

    /**
     * Approve Expense
     */
    static async approveExpense(expenseId: string, approverId: string) {
        const db = await getDb();
        return db.transaction(async (tx) => {
            const [expense] = await tx.update(expenses)
                .set({
                    status: "APPROVED",
                    approverId,
                })
                .where(eq(expenses.id, expenseId))
                .returning();

            await AuditService.log(approverId, "APPROVE_EXPENSE", "Expense", expenseId, { description: "Approved expense" }, tx);

            // Notify Requester
            if (expense.requesterId !== approverId) {
                const { CollaborationService } = await import("@/lib/collaboration");
                await CollaborationService.createNotification({
                    userId: expense.requesterId,
                    title: "Expense Approved",
                    message: `Your expense "${expense.description}" has been approved.`
                }, tx);
            }

            return expense;
        });
    }

    /**
     * Get Expenses for a Task
     */
    static async getTaskExpenses(taskId: string) {
        const db = await getDb();
        return db.query.expenses.findMany({
            where: eq(expenses.taskId, taskId),
            with: { requester: true, approver: true },
            orderBy: [desc(expenses.createdAt)],
        });
    }

    static async updateStatus(expenseId: string, status: string, userId: string) {
        const db = await getDb();
        return db.transaction(async (tx) => {
            const updateData: any = { status };
            if (status === "APPROVED") {
                updateData.approverId = userId;
            }

            const [expense] = await tx.update(expenses)
                .set(updateData)
                .where(eq(expenses.id, expenseId))
                .returning();

            await AuditService.log(userId, "UPDATE_EXPENSE_STATUS", "Expense", expenseId, { description: `Updated status to ${status}` }, tx);
            return expense;
        });
    }
}
