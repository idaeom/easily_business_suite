import { getDb, liveDb } from "@/db";
import { comments, notifications, users, tasks, expenses } from "@/db/schema";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import { sanitizeHtml } from "@/lib/sanitizer";

// Reuse the Transaction type helper
type DbTransaction = Parameters<Parameters<typeof liveDb.transaction>[0]>[0];
type DbOrTx = typeof liveDb | DbTransaction;

export class CollaborationService {
    /**
     * Add Comment to Task or Expense and Notify Mentioned Users
     */
    static async addComment(data: {
        taskId?: string;
        expenseId?: string;
        profileChangeRequestId?: string;
        leaveRequestId?: string;
        appraisalId?: string;
        payrollRunId?: string; // New
        userId: string;
        content: string;
        parentId?: string;
        mentionedUserIds?: string[];
    }) {
        if (!data.taskId && !data.expenseId && !data.profileChangeRequestId && !data.leaveRequestId && !data.appraisalId && !data.payrollRunId) {
            throw new Error("Must provide an entity ID");
        }

        // 1. Sanitize Content (Prevent XSS in comments)
        const sanitizedContent = sanitizeHtml(data.content);

        const db = await getDb();
        return db.transaction(async (tx) => {
            // 2. Create Comment
            const [comment] = await tx.insert(comments).values({
                taskId: data.taskId,
                expenseId: data.expenseId,
                profileChangeRequestId: data.profileChangeRequestId,
                leaveRequestId: data.leaveRequestId,
                appraisalId: data.appraisalId,
                payrollRunId: data.payrollRunId,
                userId: data.userId,
                content: sanitizedContent,
                parentId: data.parentId,
            }).returning();

            // 3. Fetch Context for Notifications
            let contextTitle = "";
            let contextLink = "";

            if (data.taskId) {
                const task = await tx.query.tasks.findFirst({
                    where: eq(tasks.id, data.taskId),
                    columns: { uniqueNumber: true, title: true }
                });
                if (task) {
                    contextTitle = `Task ${task.uniqueNumber}`;
                    contextLink = `/dashboard/tasks/${data.taskId}`;
                }
            } else if (data.expenseId) {
                const expense = await tx.query.expenses.findFirst({
                    where: eq(expenses.id, data.expenseId),
                    columns: { description: true, amount: true }
                });
                if (expense) {
                    contextTitle = `Expense: ${expense.description}`;
                    contextLink = `/dashboard/expenses/${data.expenseId}`;
                }
            } else if (data.profileChangeRequestId) {
                // ... (Profile Logic) ...
                const { profileChangeRequests } = await import("@/db/schema");
                const request = await tx.query.profileChangeRequests.findFirst({
                    where: eq(profileChangeRequests.id, data.profileChangeRequestId),
                    with: { user: true }
                });
                if (request && request.user) {
                    contextTitle = `Profile Change for ${request.user.name}`;
                    contextLink = `/dashboard/hr/employees/${request.userId}`;
                }
            } else if (data.leaveRequestId) {
                const { leaveRequests } = await import("@/db/schema");
                const request = await tx.query.leaveRequests.findFirst({
                    where: eq(leaveRequests.id, data.leaveRequestId),
                    with: { user: true }
                });
                if (request) {
                    contextTitle = `Leave Request for ${request.user.name}`;
                    contextLink = `/dashboard/hr/leaves`;
                }
            } else if (data.appraisalId) {
                const { appraisals } = await import("@/db/schema");
                const request = await tx.query.appraisals.findFirst({
                    where: eq(appraisals.id, data.appraisalId),
                    with: { user: true }
                });
                if (request) {
                    contextTitle = `Appraisal for ${request.user.name}`;
                    contextLink = `/dashboard/hr/appraisals`;
                }
            } else if (data.payrollRunId) {
                // Payroll Run Logic
                const { payrollRuns } = await import("@/db/schema");
                const run = await tx.query.payrollRuns.findFirst({
                    where: eq(payrollRuns.id, data.payrollRunId)
                });
                if (run) {
                    contextTitle = `Payroll Run: ${run.month}/${run.year}`;
                    contextLink = `/dashboard/hr/payroll/${run.id}`;
                }
            }

            const commenter = await tx.query.users.findFirst({
                where: eq(users.id, data.userId),
                columns: { name: true }
            });
            const commenterName = commenter?.name || "Someone";

            // 4. Handle Mentions (The "Pro" Way)
            if (data.mentionedUserIds && data.mentionedUserIds.length > 0) {
                // Eliminate duplicates and self-mentions
                const uniqueIds = [...new Set(data.mentionedUserIds)].filter(id => id !== data.userId);

                if (uniqueIds.length > 0) {
                    // Bulk Insert Notifications
                    await tx.insert(notifications).values(
                        uniqueIds.map(uid => ({
                            userId: uid,
                            title: "You were mentioned",
                            message: `${commenterName} mentioned you in ${contextTitle}`,
                            // If you added a 'link' column to schema, add it here:
                            // link: contextLink 
                        }))
                    );
                }
            }

            // 5. Handle Replies (Notify Parent Author)
            if (data.parentId) {
                const parentComment = await tx.query.comments.findFirst({
                    where: eq(comments.id, data.parentId),
                    columns: { userId: true }
                });

                // Only notify if replying to someone else, and that person wasn't already mentioned
                if (parentComment &&
                    parentComment.userId !== data.userId &&
                    !data.mentionedUserIds?.includes(parentComment.userId)
                ) {
                    await this.createNotification({
                        userId: parentComment.userId,
                        title: "New Reply",
                        message: `${commenterName} replied to your comment on ${contextTitle}`,
                    }, tx);
                }
            }

            return comment;
        });
    }

    /**
     * Get Task Comments
     */
    static async getTaskComments(taskId: string) {
        const db = await getDb();
        return db.query.comments.findMany({
            where: eq(comments.taskId, taskId),
            with: { user: true },
            orderBy: [desc(comments.createdAt)],
        });
    }

    static async getProfileRequestComments(requestId: string) {
        const db = await getDb();
        const { profileChangeRequests } = await import("@/db/schema");
        return db.query.comments.findMany({
            where: eq(comments.profileChangeRequestId, requestId),
            with: { user: true },
            orderBy: [desc(comments.createdAt)],
        });
    }

    static async getLeaveRequestComments(requestId: string) {
        const db = await getDb();
        const { leaveRequests } = await import("@/db/schema");
        return db.query.comments.findMany({
            where: eq(comments.leaveRequestId, requestId),
            with: { user: true },
            orderBy: [desc(comments.createdAt)],
        });
    }

    static async getAppraisalComments(appraisalId: string) {
        const db = await getDb();
        const { appraisals } = await import("@/db/schema");
        return db.query.comments.findMany({
            where: eq(comments.appraisalId, appraisalId),
            with: { user: true },
            orderBy: [desc(comments.createdAt)],
        });
    }

    static async getPayrollRunComments(runId: string) {
        const db = await getDb();
        const { payrollRuns } = await import("@/db/schema");
        return db.query.comments.findMany({
            where: eq(comments.payrollRunId, runId),
            with: { user: true }, // Ideally join with Employee for role info? Standard user is fine.
            orderBy: [desc(comments.createdAt)],
        });
    }

    /**
     * Create In-App Notification (Internal Helper)
     */
    static async createNotification(data: {
        userId: string;
        title: string;
        message: string;
    }, tx?: any) {
        const executor = tx || (await getDb());
        return executor.insert(notifications).values({
            ...data,
            read: false
        });
    }

    /**
     * Get Unread Notifications
     */
    static async getUserNotifications(userId: string) {
        const db = await getDb();
        return db.query.notifications.findMany({
            where: eq(notifications.userId, userId),
            orderBy: [desc(notifications.createdAt)],
            limit: 20 // Don't fetch 1000s of old notifications
        });
    }

    /**
     * Mark Notification as Read
     */
    static async markAsRead(notificationId: string, userId: string) {
        const db = await getDb();
        await db.update(notifications)
            .set({ read: true })
            .where(and(
                eq(notifications.id, notificationId),
                eq(notifications.userId, userId) // Security: Can't read others' notifications
            ));
    }

    /**
     * Mark ALL as Read
     */
    static async markAllAsRead(userId: string) {
        const db = await getDb();
        await db.update(notifications)
            .set({ read: true })
            .where(eq(notifications.userId, userId));
    }
}
