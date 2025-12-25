import { getDb } from "@/db";
import { tasks, users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export class TaskService {

    static async createTask(data: {
        title: string;
        description?: string;
        dueDate?: Date;
        assigneeId?: string;
        uniqueNumber?: string;
    }, userId: string) {
        const db = await getDb();

        const [task] = await db.insert(tasks).values({
            uniqueNumber: data.uniqueNumber || `TSK-${Date.now()}`,
            title: data.title,
            description: data.description,
            dueDate: data.dueDate,
            assigneeId: data.assigneeId,
            status: "TODO"
        }).returning();

        await this.logAction(task.id, "CREATE_TASK", userId, `Created task: ${data.title}`);

        return task;
    }

    static async updateStatus(taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE" | "CERTIFIED" | "APPROVED", userId: string) {
        const db = await getDb();

        await db.update(tasks)
            .set({ status: status })
            .where(eq(tasks.id, taskId));

        await this.logAction(taskId, "UPDATE_STATUS", userId, `Updated status to ${status}`);
    }

    static async assignTask(taskId: string, assigneeId: string, userId: string) {
        const db = await getDb();

        await db.update(tasks)
            .set({ assigneeId: assigneeId })
            .where(eq(tasks.id, taskId));

        await this.logAction(taskId, "ASSIGN_TASK", userId, `Assigned to user ${assigneeId}`);
    }

    static async getTask(taskId: string) {
        const db = await getDb();
        return await db.query.tasks.findFirst({
            where: eq(tasks.id, taskId),
            with: { assignee: true }
        });
    }

    private static async logAction(entityId: string, action: string, userId: string, details: string) {
        const db = await getDb();
        await db.insert(auditLogs).values({
            entityId,
            entityType: "TASK",
            action,
            userId,
            details: { message: details }
        });
    }
}
