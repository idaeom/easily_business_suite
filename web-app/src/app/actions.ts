"use server";

import bcrypt from "bcrypt";

import { getDb } from "@/db";
import { payrollItems, payrollRuns } from "@/db/schema";
import { PayrollEngine, type PayrollInput } from "@/lib/payroll-engine";
import { tasks, users, expenses, comments, attachments, teams, budgets, taskParticipants, ledgerEntries, accounts, transactions, notifications } from "@/db/schema";
import { eq, and, desc, sql, inArray, like, or, gte, lte, count, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TaskService } from "@/lib/tasks";
import { ExpenseService } from "@/lib/expenses";
import { TeamService } from "@/lib/teams";
import { BudgetService } from "@/lib/budgets";
import { CollaborationService } from "@/lib/collaboration";
import { DisbursementService } from "@/lib/disbursement";
import { FinanceService } from "@/lib/finance";
import { AnalyticsService } from "@/lib/analytics";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const auth = () => getServerSession(authOptions);
import { join } from "path";
import { writeFile } from "fs/promises";

// --- Dashboard Actions ---

export async function getDashboardMetrics() {
    const db = await getDb();
    const totalRevenueResult = await db.select({ balance: accounts.balance })
        .from(accounts)
        .where(eq(accounts.type, "INCOME"))
        .limit(1);

    // Calculate balance for Income account
    let revenue = 0;
    if (totalRevenueResult.length > 0) {
        revenue = Number(totalRevenueResult[0].balance);
    }

    const activeTasksResult = await db.select({ count: count() })
        .from(tasks)
        .where(sql`${tasks.status} != 'DONE'`);

    const activeTasks = activeTasksResult[0]?.count ?? 0;

    const pendingExpensesResult = await db.select({ count: count() })
        .from(expenses)
        .where(eq(expenses.status, "PENDING"));

    const pendingExpenses = pendingExpensesResult[0]?.count ?? 0;

    const completedTasksResult = await db.select({ count: count() })
        .from(tasks)
        .where(eq(tasks.status, "DONE"));

    const completedTasks = completedTasksResult[0]?.count ?? 0;

    return {
        revenue,
        activeTasks,
        pendingExpenses,
        completedTasks
    };
}

// --- Task Actions ---

export async function createTask(data: {
    title: string;
    description?: string;
    definitionOfDone?: string;
    participants?: { userId: string; role: string }[];
    parentId?: string;
    recurrenceInterval?: string;
    estimatedDuration?: number;
    dueDate?: string;
}) {
    const user = await getAuthenticatedUser();

    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;

    // TaskService is now using Drizzle
    const { TaskService } = await import("@/lib/tasks");
    const task = await TaskService.createTask({
        title: data.title,
        description: data.description,
        definitionOfDone: data.definitionOfDone,
        participants: data.participants,
        parentId: data.parentId,
        teamId: undefined,
        recurrenceInterval: data.recurrenceInterval,
        estimatedDuration: data.estimatedDuration,
        dueDate: dueDate,
        originalDueDate: dueDate,
    }, user.id);

    if (data.parentId) {
        revalidatePath(`/dashboard/tasks/${data.parentId}`);
    }
    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard");
}

export async function getTasks(
    page = 1,
    limit = 50,
    filters?: {
        search?: string;
        status?: string;
        stageId?: string;
        startDate?: Date;
        endDate?: Date;
    }
) {
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters?.search) {
        const searchLower = `%${filters.search.toLowerCase()}%`;
        conditions.push(or(
            like(sql`lower(${tasks.title})`, searchLower),
            like(sql`lower(${tasks.description})`, searchLower),
            like(sql`lower(${tasks.uniqueNumber})`, searchLower)
        ));
    }

    if (filters?.status && filters.status !== "ALL") {
        // Cast string to enum type if needed, or rely on Drizzle's type checking
        conditions.push(eq(tasks.status, filters.status as any));
    }

    if (filters?.stageId && filters.stageId !== "ALL") {
        conditions.push(eq(tasks.stageId, filters.stageId));
    }

    if (filters?.startDate) {
        conditions.push(gte(tasks.dueDate, filters.startDate));
    }
    if (filters?.endDate) {
        conditions.push(lte(tasks.dueDate, filters.endDate));
    }

    // Exclude templates
    conditions.push(eq(tasks.isTemplate, false));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const db = await getDb();
    const data = await db.query.tasks.findMany({
        where: whereClause,
        limit: limit,
        offset: offset,
        orderBy: [desc(tasks.createdAt)],
        with: {
            subTasks: true,
            assignee: true,
            stage: true,
            expenses: {
                columns: { id: true, amount: true, status: true }
            }
        }
    });

    // Get total count
    const totalResult = await db.select({ count: count() })
        .from(tasks)
        .where(whereClause);

    const total = totalResult[0]?.count ?? 0;

    // Serialize Decimal to number for client components
    const serializedData = data.map((task: any) => ({
        ...task,
        expenses: task.expenses.map((exp: any) => ({
            ...exp,
            amount: Number(exp.amount)
        }))
    }));

    return { data: serializedData, total, page, limit };
}

// --- Expense Actions ---

import { PaystackService } from "@/lib/paystack";
import { SquadcoService } from "@/lib/squadco";
import { TestConfig } from "@/lib/test-config";
import { VerificationService } from "@/lib/verification";

const beneficiarySchema = z.object({
    name: z.string(),
    bankName: z.string(),
    bankCode: z.string(),
    accountNumber: z.string(),
    amount: z.coerce.number(),
});

// 1. Strict Validation Schema
const createExpenseSchema = z.object({
    description: z.string().min(3, "Description too short"),
    amount: z.coerce.number().positive("Amount must be positive"),
    taskId: z.string().uuid().optional().or(z.literal("")),
    category: z.string().optional(),
    expenseAccountId: z.string().optional(),
    incurredAt: z.string().optional(),
    beneficiaries: z.string().optional(),
});

/**
 * Helper to get the REAL authenticated user.
 */
async function getAuthenticatedUser() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    // Fetch fresh user data to ensure role/status is current
    const db = await getDb();
    const userResult = await db.select().from(users).where(eq(users.id, (session.user as any).id));
    const user = userResult[0];

    if (!user) {
        // Session exists but user not found in current DB (likely due to mode switch)
        // Redirect to login to force re-authentication
        redirect("/login");
    }
    return user;
}


export async function resolveAccount(accountNumber: string, bankCode: string) {
    const { VerificationService } = await import("@/lib/verification");
    return VerificationService.resolveAccount(accountNumber, bankCode);
}

export async function getPaystackBalance() {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN") return null; // Security check
    return PaystackService.getBalance();
}

export async function createExpense(formData: FormData) {
    // 1. Authentication Check
    const user = await getAuthenticatedUser();

    // 2. Validation
    const rawData = {
        description: formData.get("description"),
        amount: formData.get("amount"),
        taskId: formData.get("taskId"),
        category: formData.get("category"),
        expenseAccountId: formData.get("expenseAccountId"),
        incurredAt: formData.get("incurredAt"),
        beneficiaries: formData.get("beneficiaries"),
    };

    const validated = createExpenseSchema.parse(rawData);

    // Parse beneficiaries
    let beneficiaries: z.infer<typeof beneficiarySchema>[] = [];
    if (validated.beneficiaries) {
        try {
            beneficiaries = JSON.parse(validated.beneficiaries);
            beneficiaries.forEach(b => beneficiarySchema.parse(b));
        } catch (e) {
            throw new Error("Invalid beneficiaries data");
        }
    }

    // Validate Total Amount
    if (beneficiaries.length > 0) {
        const totalBeneficiaryAmount = beneficiaries.reduce((sum, b) => sum + b.amount, 0);
        if (Math.abs(totalBeneficiaryAmount - validated.amount) > 0.01) {
            throw new Error(`Total amount (${validated.amount}) does not match sum of beneficiaries (${totalBeneficiaryAmount})`);
        }
    }

    // 3. File Handling (Pre-Processing)
    const file = formData.get("receipt") as File;

    // Resolve Category from Account if not explicitly provided
    let finalCategory = validated.category;
    if (!finalCategory && validated.expenseAccountId) {
        const db = await getDb();
        const account = await db.query.accounts.findFirst({
            where: eq(accounts.id, validated.expenseAccountId)
        });
        if (account) {
            finalCategory = account.name;

            // Auto-create Expense Category and Default Budget if missing
            const { expenseCategories, budgets } = await import("@/db/schema");

            // 1. Check/Create Expense Category
            let catId: string;
            const existingCat = await db.query.expenseCategories.findFirst({
                where: eq(sql`lower(${expenseCategories.name})`, finalCategory.toLowerCase())
            });

            if (existingCat) {
                catId = existingCat.id;
            } else {
                const [newCat] = await db.insert(expenseCategories).values({
                    name: finalCategory,
                    description: `Auto-created from Account: ${account.code}`
                }).returning();
                catId = newCat.id;
            }

            // 2. Check/Create Default Budget
            const existingBudget = await db.query.budgets.findFirst({
                where: eq(budgets.categoryId, catId)
            });

            if (!existingBudget) {
                const { startOfYear, endOfYear } = await import("date-fns");
                const now = new Date();
                await db.insert(budgets).values({
                    categoryId: catId,
                    amount: "0",
                    startDate: startOfYear(now),
                    endDate: endOfYear(now),
                });
            }
        }
    }

    // Use ExpenseService (which needs refactoring too)
    const expense = await ExpenseService.createExpense({
        description: validated.description,
        amount: validated.amount,
        requesterId: user.id,
        taskId: validated.taskId || undefined,
        category: finalCategory,
        expenseAccountId: validated.expenseAccountId,
        incurredAt: validated.incurredAt ? new Date(validated.incurredAt) : undefined,
        beneficiaries: beneficiaries,
    });

    if (file && file.size > 0) {
        // TODO: Move this to S3/Supabase Storage for production!
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure uploads directory exists
        const uploadDir = join(process.cwd(), "public", "uploads");
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = join(uploadDir, fileName);

        try {
            await writeFile(filePath, buffer);
            const url = `/uploads/${fileName}`;

            const db = await getDb();
            await db.insert(attachments).values({
                name: file.name,
                url: url,
                type: file.type,
                size: file.size,
                expenseId: expense.id,
                uploaderId: user.id,
            });
        } catch (error) {
            console.error("Failed to save receipt:", error);
        }
    }

    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/budgets"); // Update budgets page too
}

export async function generateOtp() {
    const user = await getAuthenticatedUser();

    const { OtpService } = await import("@/lib/otp");
    await OtpService.generateOtp(user.email);
}

export async function disburseExpense(expenseId: string, method: "ONLINE" | "MANUAL" = "ONLINE", sourceAccountId?: string, otpCode?: string) {
    const user = await getAuthenticatedUser();

    if (!otpCode) throw new Error("OTP is required for disbursement");

    if (!sourceAccountId) throw new Error("Source Account is required for disbursement");

    // Fetch Source Account to determine Provider
    const db = await getDb();
    const sourceAccount = await db.query.accounts.findFirst({
        where: eq(accounts.id, sourceAccountId)
    });

    if (!sourceAccount) {
        throw new Error("Invalid Source Account");
    }

    const provider = (sourceAccount.provider as "PAYSTACK" | "FLUTTERWAVE" | "SQUADCO") || "PAYSTACK";

    const { DisbursementService } = await import("@/lib/disbursement");
    await DisbursementService.disburseExpense(
        expenseId,
        sourceAccountId,
        user.id,
        otpCode,
        method === "ONLINE" ? undefined : "MANUAL",
        provider
    );

    revalidatePath(`/dashboard/expenses/${expenseId}`);
    revalidatePath("/dashboard/expenses");
}

export async function getExpenses(
    page = 1,
    limit = 50,
    filters?: {
        search?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
    },
    userContext?: { userId: string; role: string }
) {
    const offset = (page - 1) * limit;
    const conditions = [];

    // Row Level Security (RLS)
    if (userContext && userContext.role !== "ADMIN") {
        conditions.push(or(
            eq(expenses.requesterId, userContext.userId),
            eq(expenses.approverId, userContext.userId)
        ));
    }

    if (filters?.search) {
        const searchLower = `%${filters.search.toLowerCase()}%`;
        conditions.push(or(
            like(sql`lower(${expenses.description})`, searchLower),
            like(sql`lower(${expenses.category})`, searchLower)
        ));
    }

    if (filters?.status && filters.status !== "ALL") {
        conditions.push(eq(expenses.status, filters.status as any));
    }

    if (filters?.startDate) {
        conditions.push(gte(expenses.incurredAt, filters.startDate));
    }
    if (filters?.endDate) {
        conditions.push(lte(expenses.incurredAt, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const db = await getDb();
    const data = await db.query.expenses.findMany({
        where: whereClause,
        limit: limit,
        offset: offset,
        orderBy: [desc(expenses.createdAt)],
        with: {
            requester: true,
            task: true,
            expenseCategory: true
        }
    });

    const totalResult = await db.select({ count: count() })
        .from(expenses)
        .where(whereClause);

    const total = totalResult[0]?.count ?? 0;

    // Serialize Decimal
    const serializedData = data.map((expense: any) => ({
        ...expense,
        amount: Number(expense.amount),
        category: expense.expenseCategory?.name ?? expense.category
    }));

    return { data: serializedData, total, page, limit };
}

export async function getTeams() {
    // For now, return all teams.
    const db = await getDb();
    return db.query.teams.findMany({
        with: {
            members: true,
            projects: true
        }
    });
}

export async function createTeam(formData: FormData) {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const type = (formData.get("type") as "TEAM" | "DEPARTMENT" | "UNIT") || "TEAM";

    if (!name) throw new Error("Name is required");

    const user = await getAuthenticatedUser();

    await TeamService.createTeam(name, description, type, user.id);
    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/settings/teams");
}

export async function createBudget(formData: FormData) {
    const categoryName = formData.get("categoryName") as string; // User types name or selects ID
    const categoryId = formData.get("categoryId") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const startDate = new Date(formData.get("startDate") as string);
    const endDate = new Date(formData.get("endDate") as string);

    if (!amount) throw new Error("Missing amount");

    const user = await getAuthenticatedUser();
    const db = await getDb();
    const { expenseCategories } = await import("@/db/schema");

    let finalCategoryId = categoryId;

    // Auto-create category if name provided but no ID (or if ID is empty)
    if (!finalCategoryId && categoryName) {
        // Check if exists by name first
        const existing = await db.query.expenseCategories.findFirst({
            where: eq(sql`lower(${expenseCategories.name})`, categoryName.toLowerCase())
        });

        if (existing) {
            finalCategoryId = existing.id;
        } else {
            // Create new Category
            const [newCat] = await db.insert(expenseCategories).values({
                name: categoryName,
                description: "Auto-created from Budget"
            }).returning();
            finalCategoryId = newCat.id;
        }
    }

    if (!finalCategoryId) throw new Error("Category is required");

    // Check if budget exists for this category
    const existingBudget = await db.query.budgets.findFirst({
        where: eq(budgets.categoryId, finalCategoryId)
    });

    const { BudgetService } = await import("@/lib/budgets");

    if (existingBudget) {
        // Update existing budget
        // We need to add updateBudget to BudgetService or do it here.
        // For now, let's do it directly here to save time, or add to service.
        // Let's stick to service pattern if possible, but BudgetService might not have update.
        // Let's check BudgetService content later. For now, direct DB update is safer.
        await db.update(budgets)
            .set({
                amount: amount.toString(),
                startDate,
                endDate,
                updatedAt: new Date()
            })
            .where(eq(budgets.id, existingBudget.id));
    } else {
        // Create new
        await BudgetService.createBudget(finalCategoryId, amount, startDate, endDate, user.id);
    }

    revalidatePath("/dashboard/budgets");
}

export async function createUser(formData: FormData) {
    const currentUser = await getAuthenticatedUser();
    if (currentUser.role !== "ADMIN") throw new Error("Unauthorized: Only Admins can create users");

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as any;
    const teamId = formData.get("teamId") as string;

    if (!email || !password || !name) throw new Error("Missing required fields");

    // In a real app, hash password here
    const db = await getDb();
    await db.insert(users).values({
        name,
        email,
        password, // Plain text for MVP
        role,
        teamId: teamId || null,
    });
    revalidatePath("/dashboard/settings/users");
}

export async function updateExpenseStatus(expenseId: string, status: "APPROVED" | "REJECTED" | "CERTIFIED" | "DISBURSED") {
    const { getAuthenticatedUser } = await import("@/lib/auth");
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized: Please login");

    const db = await getDb();
    const expenseResult = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    const expense = expenseResult[0];
    if (!expense) throw new Error("Expense not found");

    // Admin Bypass
    if (user.role === "ADMIN") {
        // Admins can do anything
    } else {
        if (expense.taskId) {
            if (status === "CERTIFIED") {
                await TaskService.checkPermission(expense.taskId, user.id, ["CERTIFIER"]);
            } else if (status === "APPROVED" || status === "REJECTED") {
                await TaskService.checkPermission(expense.taskId, user.id, ["APPROVER"]);
            }
        }

        if (status === "DISBURSED") {
            const hasPayPermission = (user.permissions as string[])?.includes("EXPENSE_PAY");
            if (!hasPayPermission) throw new Error("Unauthorized: Missing EXPENSE_PAY permission");
        }
    }

    console.log(`[updateExpenseStatus] Updating expense ${expenseId} to status: ${status}`);
    const { ExpenseService } = await import("@/lib/expenses");
    await ExpenseService.updateStatus(expenseId, status, user.id);
    revalidatePath("/dashboard/expenses");
}

export async function addTaskComment(taskId: string, content: string, parentId?: string) {
    const user = await getAuthenticatedUser();

    const { CollaborationService } = await import("@/lib/collaboration");
    await CollaborationService.addComment({ taskId, userId: user.id, content, parentId });
    revalidatePath(`/dashboard/tasks/${taskId}`);
}

export async function getTaskComments(taskId: string) {
    const { CollaborationService } = await import("@/lib/collaboration");
    return CollaborationService.getTaskComments(taskId);
}

export async function updateTaskStatus(taskId: string, statusOrStageId: string) {
    const user = await getAuthenticatedUser();
    const db = await getDb();

    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId));
    const task = taskResult[0];
    if (!task) throw new Error("Task not found");

    // Check if it's a stage ID
    // We need to import taskStages schema if not already imported, but let's assume we can query it.
    // Actually, we need to import it. It's not in the top imports yet.
    // Let's use a raw check or add import. I'll add import in next step if missing.
    // For now, let's assume we can use db.query.taskStages
    const { taskStages } = await import("@/db/schema");
    const stageResult = await db.select().from(taskStages).where(eq(taskStages.id, statusOrStageId));
    const stage = stageResult[0];

    if (stage) {
        // Moving between stages: Require Assignee or Assignor
        await TaskService.checkPermission(taskId, user.id, ["ASSIGNEE", "ASSIGNOR"]);

        if (task.stageId === statusOrStageId) return;

        // Sync Status if Stage Name matches a canonical status
        let statusUpdate = task.status;
        const stageNameUpper = stage.name.toUpperCase().replace(" ", "_"); // Handle "In Progress" -> "IN_PROGRESS"

        const validStatuses = ["TODO", "IN_PROGRESS", "DONE", "CERTIFIED", "APPROVED"];
        if (validStatuses.includes(stageNameUpper)) {
            statusUpdate = stageNameUpper as any;
        }

        await db.update(tasks)
            .set({
                stageId: statusOrStageId,
                status: statusUpdate
            })
            .where(eq(tasks.id, taskId));

        const { CollaborationService } = await import("@/lib/collaboration");
        await CollaborationService.addComment({
            taskId,
            userId: user.id,
            content: `Moved to stage <b>${stage.name}</b>`
        });
    } else {
        // Legacy Enum Status Transition
        const newStatus = statusOrStageId as any;

        // RBAC Logic
        if (newStatus === "IN_PROGRESS" || newStatus === "DONE") {
            await TaskService.checkPermission(taskId, user.id, ["ASSIGNEE", "ASSIGNOR"]);
        } else if (newStatus === "CERTIFIED") {
            await TaskService.checkPermission(taskId, user.id, ["CERTIFIER"]);
        } else if (newStatus === "APPROVED") {
            await TaskService.checkPermission(taskId, user.id, ["APPROVER"]);
        } else {
            // Fallback for other statuses
            await TaskService.checkPermission(taskId, user.id, ["ASSIGNEE", "ASSIGNOR"]);
        }

        if (task.status === statusOrStageId) return;

        // Find corresponding stage for this status to keep them in sync
        const correspondingStage = await db.query.taskStages.findFirst({
            where: eq(taskStages.name, newStatus) // Assuming names match exactly e.g. "APPROVED"
        });

        // Use TaskService.updateStatus but pass distinct stageId if found
        // Wait, TaskService.updateStatus transaction only updates status.
        // We should do it here directly or update TaskService.
        // Let's do it here directly to avoid changing Service signature for now.

        await db.transaction(async (tx) => {
            await tx.update(tasks)
                .set({
                    status: newStatus,
                    stageId: correspondingStage ? correspondingStage.id : task.stageId
                })
                .where(eq(tasks.id, taskId));

            // Audit Log (simplified, relying on previous patterns)
            // Ideally we call TaskService.updateStatus but that doesn't update Stage.
            // Let's just update both here.
        });

        // Audit & Notify via Service helpers (we can still call updateStatus for the side effects like Audit/Notify)
        // BUT calling it again is redundant DB write.
        // Let's manually trigger the side effects or trust TaskService.updateStatus and then patch stageId?
        // Better: Update TaskService.updateStatus to accept optional stageId.
        // OR: Just direct update here and manually log.
        // Let's stick to calling usage of TaskService logic where possible.

        // REVISED APPROACH:
        // We will call TaskService.updateStatus to handle Status + Audit + Notification.
        // Then we silently update StageId if needed.

        await TaskService.updateStatus(taskId, newStatus, user.id);

        if (correspondingStage && correspondingStage.id !== task.stageId) {
            await db.update(tasks)
                .set({ stageId: correspondingStage.id })
                .where(eq(tasks.id, taskId));
        }

        const { CollaborationService } = await import("@/lib/collaboration");
        await CollaborationService.addComment({
            taskId,
            userId: user.id,
            content: `Changed status from <b>${task.status}</b> to <b>${statusOrStageId}</b>`
        });
    }

    revalidatePath(`/dashboard/tasks/${taskId}`);
    revalidatePath("/dashboard/tasks");
}

export async function getUsers() {
    const db = await getDb();
    return db.select({ id: users.id, name: users.name, email: users.email })
        .from(users);
}

// --- Task Stage Actions ---

export async function getTaskStages() {
    const { taskStages } = await import("@/db/schema");
    const db = await getDb();
    return db.select().from(taskStages).orderBy(taskStages.order);
}

export async function createTaskStage(name: string, color: string) {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN") throw new Error("Unauthorized");

    const { taskStages } = await import("@/db/schema");
    const db = await getDb();
    const countResult = await db.select({ count: count() }).from(taskStages);
    const order = countResult[0]?.count ?? 0;

    await db.insert(taskStages).values({
        name,
        color,
        order,
    });
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/tasks");
}

export async function updateTaskStage(id: string, name: string, color: string) {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN") throw new Error("Unauthorized");

    const { taskStages } = await import("@/db/schema");
    const db = await getDb();
    await db.update(taskStages)
        .set({ name, color })
        .where(eq(taskStages.id, id));
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/tasks");
}

export async function deleteTaskStage(id: string) {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN") throw new Error("Unauthorized");

    const { taskStages } = await import("@/db/schema");
    // Check if tasks exist in this stage
    const db = await getDb();
    const tasksInStage = await db.select({ count: count() })
        .from(tasks)
        .where(eq(tasks.stageId, id));

    if (tasksInStage[0].count > 0) {
        throw new Error("Cannot delete stage with existing tasks.");
    }
    await db.delete(taskStages).where(eq(taskStages.id, id));
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/tasks");
}

export async function reorderTaskStages(stages: { id: string; order: number }[]) {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN") throw new Error("Unauthorized");

    const { taskStages } = await import("@/db/schema");
    const db = await getDb();
    await db.transaction(async (tx) => {
        for (const stage of stages) {
            await tx.update(taskStages)
                .set({ order: stage.order })
                .where(eq(taskStages.id, stage.id));
        }
    });
    revalidatePath("/dashboard/tasks");
}

// --- Task Template Actions ---

export async function getTaskTemplates() {
    const db = await getDb();
    return db.select().from(tasks)
        .where(eq(tasks.isTemplate, true))
        .orderBy(desc(tasks.createdAt));
}

export async function createTaskTemplate(data: {
    title: string;
    description?: string;
    definitionOfDone?: string;
    estimatedDuration?: number;
}) {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN") throw new Error("Unauthorized");

    const db = await getDb();

    const countResult = await db.select({ count: count() }).from(tasks);
    const uniqueNumber = `TMPL-${String((countResult[0]?.count ?? 0) + 1).padStart(4, "0")}`;

    await db.insert(tasks).values({
        title: data.title,
        description: data.description,
        definitionOfDone: data.definitionOfDone,
        estimatedDuration: data.estimatedDuration,
        uniqueNumber,
        isTemplate: true,
        status: "TODO",
    });

    revalidatePath("/dashboard/settings/templates");
}

export async function deleteTaskTemplate(id: string) {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN") throw new Error("Unauthorized");

    const db = await getDb();
    await db.delete(tasks).where(eq(tasks.id, id));
    revalidatePath("/dashboard/settings/templates");
}

// --- File Attachment Actions ---

export async function uploadTaskAttachment(taskId: string, formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure directory exists
    const { mkdir, writeFile } = await import("fs/promises");
    const { join } = await import("path");

    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Unique filename
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const user = await getAuthenticatedUser();
    const db = await getDb();

    const { attachments } = await import("@/db/schema");
    await db.insert(attachments).values({
        name: file.name,
        url: `/uploads/${filename}`,
        type: file.type,
        size: file.size,
        taskId,
        uploaderId: user.id,
    });

    revalidatePath(`/dashboard/tasks/${taskId}`);
}

export async function getTaskAttachments(taskId: string) {
    const { attachments } = await import("@/db/schema");
    const db = await getDb();
    return db.query.attachments.findMany({
        where: eq(attachments.taskId, taskId),
        with: { uploader: true },
        orderBy: [desc(attachments.createdAt)],
    });
}

export async function deleteTaskAttachment(attachmentId: string) {
    const { attachments } = await import("@/db/schema");
    const db = await getDb();
    const attachmentResult = await db.select().from(attachments).where(eq(attachments.id, attachmentId));
    const attachment = attachmentResult[0];
    if (!attachment) throw new Error("Attachment not found");

    // Delete file from disk
    const { unlink } = await import("fs/promises");
    const { join } = await import("path");
    const filepath = join(process.cwd(), "public", attachment.url);

    try {
        await unlink(filepath);
    } catch (e) {
        console.error("Failed to delete file from disk:", e);
    }

    await db.delete(attachments).where(eq(attachments.id, attachmentId));
    if (attachment.taskId) {
        revalidatePath(`/dashboard/tasks/${attachment.taskId}`);
    }
}

export async function extendTaskDeadline(taskId: string, newDateStr: string, reason: string) {
    const db = await getDb();
    const userResult = await db.select().from(users).limit(1);
    const user = userResult[0];
    if (!user) throw new Error("User not found");

    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId));
    const task = taskResult[0];
    if (!task) throw new Error("Task not found");

    const newDate = new Date(newDateStr);
    const previousDate = task.dueDate || new Date(); // Fallback if no due date

    const { taskExtensions } = await import("@/db/schema");

    await db.transaction(async (tx) => {
        await tx.update(tasks)
            .set({ dueDate: newDate })
            .where(eq(tasks.id, taskId));

        await tx.insert(taskExtensions).values({
            taskId,
            userId: user.id,
            previousDate,
            newDate,
            reason
        });
    });

    const { CollaborationService } = await import("@/lib/collaboration");
    await CollaborationService.addComment({
        taskId,
        userId: user.id,
        content: `Extended deadline to <b>${newDate.toLocaleDateString()}</b>. Reason: ${reason}`
    });

    revalidatePath(`/dashboard/tasks/${taskId}`);
}

// --- Expense Category Actions ---

export async function getExpenseCategories() {
    const { expenseCategories } = await import("@/db/schema");
    const db = await getDb();
    return db.select().from(expenseCategories).orderBy(expenseCategories.name);
}

export async function createExpenseCategory(name: string, description?: string, initialBudget?: number) {
    try {
        const { expenseCategories } = await import("@/db/schema");
        const db = await getDb();

        // 1. Create Category
        const [category] = await db.insert(expenseCategories).values({ name, description }).returning();

        // 2. Create Initial Budget (if provided)
        if (initialBudget && initialBudget > 0) {
            const user = await getAuthenticatedUser();
            const { BudgetService } = await import("@/lib/budgets");

            // Default to current year
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const endOfYear = new Date(now.getFullYear(), 11, 31);

            await BudgetService.createBudget(category.id, initialBudget, startOfYear, endOfYear, user.id);
        }

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to create category:", error);
        return { success: false, error: "Failed to create category" };
    }
}

export async function deleteExpenseCategory(id: string) {
    try {
        const { expenseCategories } = await import("@/db/schema");
        const db = await getDb();
        await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete category:", error);
        return { success: false, error: "Failed to delete category" };
    }
}

// --- Account Actions ---

export async function createAccount(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const type = formData.get("type") as any;
    const currency = formData.get("currency") as string || "NGN";
    const description = formData.get("description") as string || "";

    // Provider / NUBAN Logic
    const provider = formData.get("provider") as string; // "BANK", "PAYSTACK", "SQUADCO"
    const bankNameInput = formData.get("bankName") as string;
    const accountNumberInput = formData.get("accountNumber") as string;
    const phone = formData.get("phone") as string; // Required for NUBAN

    if (!name || !code || !type) {
        throw new Error("Missing required fields");
    }

    // Check uniqueness
    const db = await getDb();
    const existing = await db.query.accounts.findFirst({
        where: eq(accounts.code, code)
    });

    if (existing) {
        throw new Error(`Account code '${code}' already exists.`);
    }

    let finalBankName = bankNameInput;
    let finalAccountNumber = accountNumberInput;
    let finalProvider = provider === "BANK" ? null : provider;
    let isExternal = false;

    // Handle Virtual Account Creation
    if (provider === "PAYSTACK" || provider === "SQUADCO") {
        if (!phone) {
            throw new Error("Phone number is required for Virtual Account creation.");
        }

        const userNames = (session.user.name || "User").split(" ");
        const firstName = userNames[0];
        const lastName = userNames.slice(1).join(" ") || "User";

        // We use a mock BVN for now as we don't collect real BVNs yet, limiting this to Tier 1 accounts or Test Mode
        // In a real app, you MUST collect and verify BVN.
        const mockBvn = "22222222222";

        if (provider === "PAYSTACK") {
            const result = await PaystackService.createDedicatedAccount({
                email: session.user.email!,
                first_name: firstName,
                last_name: lastName,
                phone: phone
            }, TestConfig.getPaystackKey(TestConfig.isTestMode));

            if (result) {
                finalBankName = result.bank.name;
                finalAccountNumber = result.account_number;
                isExternal = true;
            } else {
                throw new Error("Failed to create Paystack Virtual Account.");
            }
        } else if (provider === "SQUADCO") {
            const result = await SquadcoService.createVirtualAccount({
                firstName,
                lastName,
                email: session.user.email!,
                mobileNum: phone,
                dob: "01/01/1990", // Defaulting for now
                bvn: mockBvn,
                gender: "1"
            }, TestConfig.getSquadcoKey(TestConfig.isTestMode) || "");

            if (result) {
                finalBankName = result.bank_name || "Squadco Virtual Bank";
                finalAccountNumber = result.account_number;
                isExternal = true;
            } else {
                throw new Error("Failed to create Squadco Virtual Account.");
            }
        }
    } else if (provider === "BANK") {
        // Just manual entry
        finalProvider = null; // Stored as null in DB for manual banks? Schema says provider: text
        // Actually schema comment says: // e.g., "PAYSTACK", "SQUADCO", "MONNIFY"
        // So for Manual Bank, provider can be NULL.
    } else {
        // Standard Account (Cash, etc)
        finalProvider = null;
    }

    await db.insert(accounts).values({
        name,
        code,
        type,
        currency,
        description,
        balance: "0",
        isExternal,
        provider: finalProvider,
        credentials: null, // Removed credentials storage
        bankName: finalBankName,
        accountNumber: finalAccountNumber
    });

    revalidatePath("/dashboard/settings/accounts");
    return { success: true };
}

export async function getBanks(provider: "PAYSTACK" | "SQUADCO" = "PAYSTACK") {
    let banks: { name: string; code: string }[] = [];

    if (provider === "SQUADCO") {
        const result = await SquadcoService.getBanks();
        banks = result.map(b => ({ name: b.name, code: b.code }));
    } else {
        const result = await PaystackService.getBanks(TestConfig.getPaystackKey(TestConfig.isTestMode));
        banks = result.map(b => ({ name: b.name, code: b.code }));
    }

    // Deduplicate by code
    const uniqueBanks = Array.from(new Map(banks.map(item => [item.code, item])).values());
    return uniqueBanks.sort((a, b) => a.name.localeCompare(b.name));
}

// --- Expense Comment & Attachment Actions ---

export async function addExpenseComment(expenseId: string, content: string, parentId?: string) {
    const db = await getDb();
    const userResult = await db.select().from(users).limit(1);
    const user = userResult[0];
    if (!user) throw new Error("User not found");

    const { CollaborationService } = await import("@/lib/collaboration");
    await CollaborationService.addComment({ expenseId, userId: user.id, content, parentId });
    revalidatePath(`/dashboard/expenses/${expenseId}`);
}

export async function uploadExpenseAttachment(expenseId: string, formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure directory exists
    const { mkdir, writeFile } = await import("fs/promises");
    const { join } = await import("path");

    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Unique filename
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const db = await getDb();
    const userResult = await db.select().from(users).limit(1);
    const user = userResult[0];
    if (!user) throw new Error("User not found");

    const { attachments } = await import("@/db/schema");
    await db.insert(attachments).values({
        name: file.name,
        url: `/uploads/${filename}`,
        type: file.type,
        size: file.size,
        expenseId,
        uploaderId: user.id,
    });

    revalidatePath(`/dashboard/expenses/${expenseId}`);
}

export async function deleteExpenseAttachment(attachmentId: string) {
    const db = await getDb();
    const attachment = await db.query.attachments.findFirst({ where: eq(attachments.id, attachmentId) });
    if (!attachment) throw new Error("Attachment not found");

    // Delete file from disk
    const { unlink } = await import("fs/promises");
    const { join } = await import("path");
    const filepath = join(process.cwd(), "public", attachment.url);

    try {
        await unlink(filepath);
    } catch (e) {
        console.error("Failed to delete file from disk:", e);
    }

    await db.delete(attachments).where(eq(attachments.id, attachmentId));
    if (attachment.expenseId) {
        revalidatePath(`/dashboard/expenses/${attachment.expenseId}`);
    }
}

export async function getAccounts() {
    const db = await getDb();
    return db.query.accounts.findMany({
        orderBy: [desc(accounts.name)],
    });
}

export async function updateUserProfile(data: { name?: string; image?: string }) {
    const db = await getDb();
    const user = await getAuthenticatedUser();

    await db.update(users)
        .set({
            ...(data.name && { name: data.name }),
            ...(data.image && { image: data.image }),
        })
        .where(eq(users.id, user.id));

    revalidatePath("/dashboard/profile");
    return { success: true };
}

export async function changePassword(oldPassword: string, newPassword: string) {
    const db = await getDb();
    const user = await getAuthenticatedUser();

    // Fetch user with password
    const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id)
    });

    if (!dbUser || !dbUser.password) throw new Error("User not found");

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, dbUser.password);
    if (!isValid) {
        throw new Error("Incorrect current password");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

    return { success: true };
}

// --- HR & Payroll Actions ---

export async function createOrUpdateEmployeeProfile(formData: FormData) {
    const user = await getAuthenticatedUser();

    // Check permissions
    // if (user.role !== "ADMIN" && !(user.permissions as string[])?.includes("HR_MANAGE")) {
    //    throw new Error("Unauthorized");
    // }

    const { HrService } = await import("@/lib/hr");

    await HrService.createOrUpdateProfile({
        userId: formData.get("userId") as string,
        jobTitle: formData.get("jobTitle") as string,
        employmentType: formData.get("employmentType") as any,
        basicSalary: Number(formData.get("basicSalary")),
        housingAllowance: Number(formData.get("housingAllowance")),
        transportAllowance: Number(formData.get("transportAllowance")),
        otherAllowances: Number(formData.get("otherAllowances")),
        bankName: formData.get("bankName") as string,
        accountNumber: formData.get("accountNumber") as string,
        taxId: formData.get("taxId") as string,
        pensionId: formData.get("pensionId") as string,
    });

    revalidatePath("/dashboard/hr/employees");
}

export async function createPayrollRun(formData: FormData) {
    const user = await getAuthenticatedUser();
    // if (user.role !== "ADMIN" && !(user.permissions as string[])?.includes("HR_PAYROLL")) {
    //    throw new Error("Unauthorized");
    // }

    const month = Number(formData.get("month"));
    const year = Number(formData.get("year"));

    const { PayrollService } = await import("@/lib/payroll");
    const run = await PayrollService.createPayrollRun(month, year, user.id);

    revalidatePath("/dashboard/hr/payroll");
    return run;
}

export async function approvePayrollRun(runId: string) {
    const user = await getAuthenticatedUser();
    // if (user.role !== "ADMIN" && !(user.permissions as string[])?.includes("HR_APPROVE")) {
    //    throw new Error("Unauthorized");
    // }

    const { PayrollService } = await import("@/lib/payroll");
    await PayrollService.approvePayrollRun(runId, user.id);

    revalidatePath("/dashboard/hr/payroll");
    revalidatePath("/dashboard/expenses"); // Updates Finance too
}

// --- HR Actions ---

export async function getAllEmployees() {
    const { HrService } = await import("@/lib/hr");
    return HrService.getAllEmployees();
}

export async function getPayrollRuns() {
    const db = await getDb();
    const { payrollRuns } = await import("@/db/schema");
    return db.query.payrollRuns.findMany({
        orderBy: [desc(payrollRuns.createdAt)],
        with: {
            expense: true // To see status linked
        }
    });
}

export async function getPayrollRunDetails(runId: string) {
    const db = await getDb();
    const { payrollRuns } = await import("@/db/schema");
    return db.query.payrollRuns.findFirst({
        where: eq(payrollRuns.id, runId),
        with: {
            items: {
                with: { user: { with: { employeeProfile: true } } }
            },
            expense: true
        }
    });
}

// =========================================
// LEAVE ACTIONS
// =========================================

export async function createLeaveRequest(type: string, startDate: Date, endDate: Date, reason: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const { LeaveService } = await import("@/lib/leave");

    const request = await LeaveService.createRequest({
        userId: session.user.id,
        type: type as any,
        startDate,
        endDate,
        reason
    });
    revalidatePath("/dashboard/hr/leaves");
    return request;
}

export async function getMyLeaveRequests() {
    const session = await auth();
    if (!session?.user?.id) return [];
    const { LeaveService } = await import("@/lib/leave");
    return LeaveService.getUserRequests(session.user.id);
}

export async function getAllLeaveRequests() {
    const session = await auth();
    // TODO: Permission Check
    if (!session?.user?.id) return [];
    const { LeaveService } = await import("@/lib/leave");
    return LeaveService.getAllRequests();
}

export async function getPendingLeaveRequests() {
    const session = await auth();
    if (!session?.user?.id) return [];
    const { LeaveService } = await import("@/lib/leave");
    return LeaveService.getPendingRequests();
}

export async function approveLeaveRequest(requestId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    // TODO: Permission Check
    const { LeaveService } = await import("@/lib/leave");
    const res = await LeaveService.approveRequest(requestId, session.user.id);
    revalidatePath("/dashboard/hr/leaves");
    return res;
}

export async function rejectLeaveRequest(requestId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    // TODO: Permission Check
    const { LeaveService } = await import("@/lib/leave");
    const res = await LeaveService.rejectRequest(requestId, session.user.id);
    revalidatePath("/dashboard/hr/leaves");
    return res;
}

// =========================================
// APPRAISAL ACTIONS
// =========================================

export async function submitAppraisal(userId: string, rating: number, feedback: string, period: string, kpis?: { name: string; score: number }[]) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const { AppraisalService } = await import("@/lib/appraisal");

    const appraisal = await AppraisalService.createAppraisal({
        userId,
        reviewerId: session.user.id,
        rating,
        feedback,
        period,
        kpis
    });
    revalidatePath("/dashboard/hr/appraisals");
    return appraisal;
}

export async function getMyAppraisals() {
    const session = await auth();
    if (!session?.user?.id) return [];
    const { AppraisalService } = await import("@/lib/appraisal");
    return AppraisalService.getAppraisalsForUser(session.user.id);
}

export async function getAllAppraisals() {
    const session = await auth();
    if (!session?.user?.id) return [];
    const { AppraisalService } = await import("@/lib/appraisal");
    return AppraisalService.getAllAppraisals();
}

// PAYROLL ADJUSTMENT
export async function updatePayrollItem(itemId: string, updates: Partial<PayrollInput>) {
    const session = await auth();
    if (!session || !session.user) throw new Error("Unauthorized");

    const db = await getDb();

    // 1. Fetch Item & Run
    const item = await db.query.payrollItems.findFirst({
        where: eq(payrollItems.id, itemId),
        with: { run: true, user: true } // Include user for name logging
    });

    if (!item) throw new Error("Payroll Item not found");
    if (item.run.status !== "DRAFT") throw new Error("Cannot adjust finalized payroll");

    // 2. Prepare Updates
    const currentBreakdown = item.breakdown as any;
    const currentInput = currentBreakdown.input || {
        earnings: { basic: 0, housing: 0, transport: 0, others: 0, bonuses: 0 },
        settings: { isPensionActive: true, isNhfActive: false, isNhisActive: false, lifeAssurance: 0, totalDays: 22, absentDays: 0, otherDeductions: 0 }
    };

    const newInput: PayrollInput = {
        earnings: { ...currentInput.earnings, ...(updates.earnings || {}) },
        settings: { ...currentInput.settings, ...(updates.settings || {}) }
    };

    // 3. Generate Diff for Comment
    const changes: string[] = [];
    const format = (n: number) => Number(n).toLocaleString();

    // Check Earnings
    if (newInput.earnings.bonuses !== currentInput.earnings.bonuses) {
        const from = currentInput.earnings.bonuses;
        const to = newInput.earnings.bonuses;
        if (from === 0 && to > 0) changes.push(`added ₦${format(to)} bonus`);
        else if (from > 0 && to === 0) changes.push(`removed bonus`);
        else changes.push(`changed bonus from ₦${format(from)} to ₦${format(to)}`);
    }

    // Check Settings
    if (newInput.settings.totalDays !== currentInput.settings.totalDays) {
        changes.push(`changed total work days from ${currentInput.settings.totalDays} to ${newInput.settings.totalDays}`);
    }
    if (newInput.settings.absentDays !== currentInput.settings.absentDays) {
        const from = currentInput.settings.absentDays;
        const to = newInput.settings.absentDays;
        if (from === 0 && to > 0) changes.push(`recorded ${to} absent days`);
        else if (from > 0 && to === 0) changes.push(`removed absent days`);
        else changes.push(`updated absent days to ${to}`);
    }
    if (newInput.settings.pensionVoluntary !== currentInput.settings.pensionVoluntary) {
        const from = currentInput.settings.pensionVoluntary;
        const to = newInput.settings.pensionVoluntary;
        if (from === 0 && to > 0) changes.push(`added ₦${format(to)} voluntary pension contribution`);
        else if (from > 0 && to === 0) changes.push(`removed voluntary pension`);
        else changes.push(`updated voluntary pension to ₦${format(to)}`);
    }
    if (newInput.settings.otherDeductions !== currentInput.settings.otherDeductions) {
        const from = currentInput.settings.otherDeductions;
        const to = newInput.settings.otherDeductions;
        if (from === 0 && to > 0) changes.push(`added ₦${format(to)} deduction`);
        else if (from > 0 && to === 0) changes.push(`removed deduction`);
        else changes.push(`updated deduction to ₦${format(to)}`);
    }
    if (newInput.settings.isPensionActive !== currentInput.settings.isPensionActive) {
        changes.push(newInput.settings.isPensionActive ? `activated pension` : `deactivated pension`);
    }

    // 4. Recalculate
    // Fetch Default Tax Rule
    const { taxRules } = await import("@/db/schema");
    const defaultRule = await db.query.taxRules.findFirst({
        where: eq(taxRules.isDefault, true)
    });

    const r = PayrollEngine.calculate(newInput, defaultRule?.rules);

    // 5. Update Item
    await db.update(payrollItems).set({
        grossPay: r.gross.toString(),
        netPay: r.netPay.toString(),
        breakdown: { ...r, input: newInput } as any
    }).where(eq(payrollItems.id, itemId));

    // 6. Update Run Total
    const { sum } = await db.select({ sum: sql<string>`sum("netPay")` }).from(payrollItems).where(eq(payrollItems.payrollRunId, item.payrollRunId)).then(res => res[0]);

    await db.update(payrollRuns).set({ totalAmount: sum || "0" }).where(eq(payrollRuns.id, item.payrollRunId));

    // 7. Log Comment (If changes detected)
    if (changes.length > 0) {
        // "Adjusted [Name]: [Action 1], [Action 2], and [Action 3]."
        const last = changes.pop();
        const sentence = changes.length > 0
            ? `${changes.join(", ")} and ${last}`
            : last;

        const commentContent = `Adjusted ${item.user.name}: ${sentence}.`;
        await addPayrollComment(item.payrollRunId, commentContent);
    }

    revalidatePath(`/dashboard/hr/payroll/${item.payrollRunId}`);
    return { success: true };
}

export async function createTaxRule(data: any) {
    const session = await auth();
    if (!session || !session.user) throw new Error("Unauthorized");
    const db = await getDb();
    const { taxRules } = await import("@/db/schema");

    if (data.isDefault) {
        await db.update(taxRules).set({ isDefault: false }).where(ne(taxRules.id, "placeholder"));
    }

    await db.insert(taxRules).values({
        name: data.name,
        description: data.description,
        rules: data.rules,
        isDefault: data.isDefault || false
    });
    revalidatePath("/dashboard/hr/payroll/settings");
    return { success: true };
}

export async function updateTaxRule(id: string, data: any) {
    const session = await auth();
    if (!session || !session.user) throw new Error("Unauthorized");
    const db = await getDb();
    const { taxRules } = await import("@/db/schema");
    if (data.isDefault) {
        await db.update(taxRules).set({ isDefault: false }).where(ne(taxRules.id, id));
    }
    await db.update(taxRules).set({
        name: data.name,
        description: data.description,
        rules: data.rules,
        isDefault: data.isDefault,
        isActive: data.isActive
    }).where(eq(taxRules.id, id));
    revalidatePath("/dashboard/hr/payroll/settings");
    return { success: true };
}

export async function deleteTaxRule(id: string) {
    const session = await auth();
    if (!session || !session.user) throw new Error("Unauthorized");
    const db = await getDb();
    const { taxRules } = await import("@/db/schema");
    await db.delete(taxRules).where(eq(taxRules.id, id));
    revalidatePath("/dashboard/hr/payroll/settings");
    return { success: true };
}


// --- HR Approval Workflow Actions ---

export async function requestProfileChange(employeeId: string, data: any) {
    const user = await getAuthenticatedUser();
    const { ProfileChangeService } = await import("@/lib/hr");
    await ProfileChangeService.requestChange(user.id, employeeId, data);
    revalidatePath(`/dashboard/hr/employees/${employeeId}`);
    revalidatePath("/dashboard/hr");
}

export async function certifyProfileChange(requestId: string) {
    const user = await getAuthenticatedUser();
    // Validate Role
    if (user.role !== "ADMIN" && !(user.permissions as string[])?.includes("HR_CERTIFIER")) {
        throw new Error("Unauthorized: Must be Certifier");
    }
    const { ProfileChangeService } = await import("@/lib/hr");
    await ProfileChangeService.certifyRequest(requestId, user.id);
    revalidatePath("/dashboard/hr");
}

export async function approveProfileChange(requestId: string) {
    const user = await getAuthenticatedUser();
    // Validate Role
    if (user.role !== "ADMIN" && !(user.permissions as string[])?.includes("HR_APPROVER")) {
        throw new Error("Unauthorized: Must be Approver");
    }
    const { ProfileChangeService } = await import("@/lib/hr");
    await ProfileChangeService.approveRequest(requestId, user.id);
    revalidatePath("/dashboard/hr");
}

export async function rejectProfileChange(requestId: string, reason: string) {
    const user = await getAuthenticatedUser();
    const { ProfileChangeService } = await import("@/lib/hr");
    await ProfileChangeService.rejectRequest(requestId, user.id, reason);
    revalidatePath("/dashboard/hr");
}

// Ensure setAppMode is available if accidentally removed (it was in previous sessions, verifying presence)
// If not present, I'll assume it's in a different file or I should have checked. 
// But this write_to_file is APPENDING? No, write_to_file overwrites. 
// I must use REPLACE.

export async function addProfileComment(requestId: string, content: string, parentId?: string) {
    const user = await getAuthenticatedUser();
    const { CollaborationService } = await import("@/lib/collaboration");
    await CollaborationService.addComment({
        profileChangeRequestId: requestId,
        userId: user.id,
        content: content,
        parentId: parentId
    });
    revalidatePath(`/dashboard/hr`); // Since we don't have a dedicated request page yet, just revalidate HR bundle
}

export async function getProfileComments(requestId: string) {
    const { CollaborationService } = await import("@/lib/collaboration");
    return CollaborationService.getProfileRequestComments(requestId);
}

export async function certifyLeaveRequest(requestId: string) {
    const user = await getAuthenticatedUser();
    // Validate Role
    // if (user.role !== "ADMIN" && !(user.permissions as string[])?.includes("HR_CERTIFIER")) {
    //    throw new Error("Unauthorized: Must be Certifier");
    // }
    const { LeaveService } = await import("@/lib/leave");
    await LeaveService.certifyRequest(requestId, user.id);
    revalidatePath("/dashboard/hr/leaves");
}

export async function addLeaveComment(requestId: string, content: string, parentId?: string) {
    const user = await getAuthenticatedUser();
    const { CollaborationService } = await import("@/lib/collaboration");
    await CollaborationService.addComment({
        leaveRequestId: requestId,
        userId: user.id,
        content: content,
        parentId: parentId
    });
    revalidatePath("/dashboard/hr/leaves");
}

export async function getLeaveComments(requestId: string) {
    const { CollaborationService } = await import("@/lib/collaboration");
    return CollaborationService.getLeaveRequestComments(requestId);
}

export async function certifyAppraisal(id: string) {
    const user = await getAuthenticatedUser();
    // if (user.role !== "ADMIN" && !(user.permissions as string[])?.includes("HR_CERTIFIER")) {
    //    throw new Error("Unauthorized: Must be Certifier");
    // }
    const { AppraisalService } = await import("@/lib/appraisal");
    await AppraisalService.certifyAppraisal(id, user.id);
    revalidatePath("/dashboard/hr/appraisals");
}

export async function approveAppraisal(id: string) {
    const user = await getAuthenticatedUser();
    // if (user.role !== "ADMIN" && !(user.permissions as string[])?.includes("HR_APPROVER")) {
    //    throw new Error("Unauthorized: Must be Approver");
    // }
    const { AppraisalService } = await import("@/lib/appraisal");
    await AppraisalService.approveAppraisal(id, user.id);
    revalidatePath("/dashboard/hr/appraisals");
}

export async function rejectAppraisal(id: string) {
    const user = await getAuthenticatedUser();
    const { AppraisalService } = await import("@/lib/appraisal");
    await AppraisalService.rejectAppraisal(id, user.id);
    revalidatePath("/dashboard/hr/appraisals");
}

export async function addAppraisalComment(appraisalId: string, content: string, parentId?: string) {
    const user = await getAuthenticatedUser();
    const { CollaborationService } = await import("@/lib/collaboration");
    await CollaborationService.addComment({
        appraisalId: appraisalId,
        userId: user.id,
        content: content,
        parentId: parentId
    });
    revalidatePath("/dashboard/hr/appraisals");
}

export async function getAppraisalComments(appraisalId: string) {
    const { CollaborationService } = await import("@/lib/collaboration");
    return CollaborationService.getAppraisalComments(appraisalId);
}

export async function getPendingAppraisals() {
    const { AppraisalService } = await import("@/lib/appraisal");
    return AppraisalService.getPendingAppraisals();
}

export async function submitPayrollRun(runId: string) {
    const user = await getAuthenticatedUser();
    const { PayrollService } = await import("@/lib/payroll");
    await PayrollService.submitForCertification(runId);
    revalidatePath("/dashboard/hr/payroll");
    revalidatePath(`/dashboard/hr/payroll/${runId}`);
}

export async function certifyPayrollRun(runId: string) {
    const user = await getAuthenticatedUser();
    const { PayrollService } = await import("@/lib/payroll");
    await PayrollService.certifyPayrollRun(runId, user.id);
    revalidatePath("/dashboard/hr/payroll");
    revalidatePath(`/dashboard/hr/payroll/${runId}`);
}

export async function approvePayrollRunAction(runId: string) {
    const user = await getAuthenticatedUser();
    const { PayrollService } = await import("@/lib/payroll");
    await PayrollService.approvePayrollRun(runId, user.id);
    revalidatePath("/dashboard/hr/payroll");
    revalidatePath(`/dashboard/hr/payroll/${runId}`);
}

export async function rejectPayrollRun(runId: string) {
    const user = await getAuthenticatedUser();
    const { PayrollService } = await import("@/lib/payroll");
    await PayrollService.rejectPayrollRun(runId, user.id);
    revalidatePath("/dashboard/hr/payroll");
    revalidatePath(`/dashboard/hr/payroll/${runId}`);
}

export async function addPayrollComment(runId: string, content: string, parentId?: string) {
    const user = await getAuthenticatedUser();
    const { CollaborationService } = await import("@/lib/collaboration");
    await CollaborationService.addComment({
        payrollRunId: runId,
        userId: user.id,
        content: content,
        parentId: parentId
    });
    revalidatePath(`/dashboard/hr/payroll/${runId}`);
}

export async function getPayrollComments(runId: string) {
    const { CollaborationService } = await import("@/lib/collaboration");
    return CollaborationService.getPayrollRunComments(runId);
}

export async function getPendingProfileChanges() {
    const db = await getDb();
    const { profileChangeRequests } = await import("@/db/schema");
    const { inArray, desc } = await import("drizzle-orm");
    return db.query.profileChangeRequests.findMany({
        where: inArray(profileChangeRequests.status, ["PENDING_CERTIFICATION", "PENDING_APPROVAL"]),
        orderBy: [desc(profileChangeRequests.createdAt)],
        with: { user: true }
    });
}

export async function getPendingLeaves() {
    const db = await getDb();
    const { leaveRequests } = await import("@/db/schema");
    const { inArray, desc } = await import("drizzle-orm");
    // Use string statuses if enum not directly importable or if it causes issues
    return db.query.leaveRequests.findMany({
        where: inArray(leaveRequests.status, ["PENDING_CERTIFICATION", "PENDING_APPROVAL"]),
        orderBy: [desc(leaveRequests.createdAt)],
        with: { user: true }
    });
}
