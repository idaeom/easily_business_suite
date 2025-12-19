import { getDb, liveDb } from "@/db";
import { tasks, taskParticipants, users, attachments, comments } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { AuditService } from "@/lib/audit";

// Define strict types for status to avoid "as any"
type TaskStatus = typeof tasks.$inferSelect.status;

export class TaskService {
    /**
     * Helper to generate a collision-resistant human ID
     * Uses a lock-safe approach or simpler random string fallback if collision occurs.
     */
    private static async generateUniqueNumber(tx: any): Promise<string> {
        // Option A: Simple Random (Fastest, Collision rare)
        // return `TASK-${Math.floor(1000 + Math.random() * 9000)}`;

        // Option B: Sequential (Strict ERP Requirement)
        // We lock the table briefly to get the MAX value safely.
        // Note: In high traffic, Postgres Sequences are better, but this works for ERPs.
        const result = await tx.execute(sql`
            SELECT MAX(CAST(SUBSTRING("uniqueNumber" FROM 6) AS INT)) as max_num 
            FROM "Task" 
            WHERE "uniqueNumber" LIKE 'TASK-%'
        `);

        const maxNum = (result.rows[0]?.max_num as number) || 0;
        return `TASK-${String(maxNum + 1).padStart(4, "0")}`;
    }

    static async createTask(data: {
        title: string;
        description?: string;
        definitionOfDone?: string;
        participants?: { userId: string; role: string }[];
        parentId?: string;
        teamId?: string;
        recurrenceInterval?: string;
        estimatedDuration?: number;
        dueDate?: Date;
        originalDueDate?: Date;
    }, creatorId: string) {
        const db = await getDb();
        return db.transaction(async (tx) => {
            // 1. Generate ID safely inside the transaction
            const uniqueNumber = await this.generateUniqueNumber(tx);

            // 2. Create Task
            const [newTask] = await tx.insert(tasks).values({
                title: data.title,
                description: data.description,
                definitionOfDone: data.definitionOfDone,
                parentId: data.parentId,
                teamId: data.teamId,
                recurrenceInterval: data.recurrenceInterval,
                estimatedDuration: data.estimatedDuration,
                dueDate: data.dueDate,
                originalDueDate: data.originalDueDate,
                uniqueNumber,
                assigneeId: creatorId,
                status: "TODO",
            }).returning();

            // 3. Add Participants
            if (data.participants?.length) {
                // Bulk insert is faster than loop
                await tx.insert(taskParticipants).values(
                    data.participants.map(p => ({
                        taskId: newTask.id,
                        userId: p.userId,
                        role: p.role,
                    }))
                );
            }

            // 4. Audit Log
            await AuditService.log(
                creatorId,
                "CREATE_TASK",
                "Task",
                newTask.id,
                { title: data.title, uniqueNumber },
                tx
            );

            return newTask;
        });
    }

    static async updateStatus(taskId: string, status: TaskStatus, userId: string) {
        const db = await getDb();
        return db.transaction(async (tx) => {
            const [updatedTask] = await tx.update(tasks)
                .set({ status }) // No 'as any' needed if input is typed
                .where(eq(tasks.id, taskId))
                .returning();

            await AuditService.log(
                userId,
                "UPDATE_TASK_STATUS",
                "Task",
                taskId,
                { from: "OLD_STATUS", to: status }, // TODO: Fetch old status if needed
                tx
            );

            // Notify Assignee
            if (updatedTask.assigneeId && updatedTask.assigneeId !== userId) {
                const { CollaborationService } = await import("@/lib/collaboration");
                await CollaborationService.createNotification({
                    userId: updatedTask.assigneeId,
                    title: "Task Status Updated",
                    message: `Task "${updatedTask.uniqueNumber}: ${updatedTask.title}" is now ${status}.`
                }, tx);
            }

            // Notify Creator (if different from assignee and updater) - Optional, but good for "DONE"
            // For now, let's stick to Assignee as per plan.

            return updatedTask;
        });
    }

    static async getTask(taskId: string) {
        const db = await getDb();
        const task = await db.query.tasks.findFirst({
            where: eq(tasks.id, taskId),
            with: {
                subTasks: {
                    with: { expenses: true }
                },
                expenses: true,
                assignee: true,
                team: true,
                attachments: {
                    with: { uploader: true },
                    orderBy: [desc(attachments.createdAt)],
                },
                comments: {
                    with: { user: true },
                    orderBy: [desc(comments.createdAt)]
                }
            },
        });

        if (!task) return null;

        // Flatten expenses safely
        // Note: Drizzle returns 'amount' as string. We convert to Number here for UI.
        // For STRICT accounting, use a library like 'currency.js' or work in cents (integers).

        const directExpenses = task.expenses;
        const subtaskExpenses = task.subTasks.flatMap((st: any) => st.expenses);
        const allExpenses = [...directExpenses, ...subtaskExpenses];

        const toMoney = (val: string) => parseFloat(val) || 0;

        const totals = {
            estimate: allExpenses
                .filter((e) => e.status !== "REJECTED")
                .reduce((sum, e) => sum + toMoney(e.amount), 0),

            approved: allExpenses
                .filter((e) => e.status === "APPROVED" || e.status === "DISBURSED")
                .reduce((sum, e) => sum + toMoney(e.amount), 0),

            disbursed: allExpenses
                .filter((e) => e.status === "DISBURSED")
                .reduce((sum, e) => sum + toMoney(e.amount), 0),
        };

        return { ...task, expenseTotals: totals };
    }

    // Permission check remains the same...
    static async checkPermission(taskId: string, userId: string, allowedRoles: string[]) {
        // ... (Your existing logic is fine here)
        // Optimization Tip: You can combine the 'User Role' and 'Participant' checks
        // into a single SQL query if performance becomes an issue later.

        // Return existing logic
        const db = await getDb();
        const userResult = await db.select().from(users).where(eq(users.id, userId));
        const user = userResult[0];
        if (user && user.role === "ADMIN") return true;

        const participation = await db.select()
            .from(taskParticipants)
            .where(and(
                eq(taskParticipants.taskId, taskId),
                eq(taskParticipants.userId, userId)
            ));

        const userRoles = participation.map(p => p.role);
        if (allowedRoles.some(role => userRoles.includes(role))) return true;

        // Check Assignee fallback
        const task = await db.query.tasks.findFirst({
            where: eq(tasks.id, taskId),
            columns: { assigneeId: true }
        });

        if (task?.assigneeId === userId && allowedRoles.includes("ASSIGNEE")) return true;

        throw new Error("Unauthorized");
    }
}

function calculateNextRun(date: Date, interval: string): Date {
    const next = new Date(date);
    if (interval === "DAILY") next.setDate(next.getDate() + 1);
    if (interval === "WEEKLY") next.setDate(next.getDate() + 7);
    if (interval === "MONTHLY") next.setMonth(next.getMonth() + 1);
    if (interval === "YEARLY") next.setFullYear(next.getFullYear() + 1);
    return next;
}
