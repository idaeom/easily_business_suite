import { getDb } from "@/db";
import { tasks, expenses, teams } from "@/db/schema";
import { eq, count, sum, sql } from "drizzle-orm";

export class AnalyticsService {
    /**
     * Calculates task completion rate.
     */
    static async getTaskCompletionRate() {
        const db = await getDb();
        const totalResult = await db.select({ count: count() }).from(tasks);
        const totalTasks = totalResult[0]?.count ?? 0;

        const completedResult = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, "DONE"));
        const completedTasks = completedResult[0]?.count ?? 0;

        if (totalTasks === 0) return 0;
        return (completedTasks / totalTasks) * 100;
    }

    /**
     * Gets expense trends (total amount) grouped by status.
     */
    static async getExpenseTrends() {
        const db = await getDb();
        const expenseTrends = await db.select({
            status: expenses.status,
            totalAmount: sum(expenses.amount),
        })
            .from(expenses)
            .groupBy(expenses.status);

        return expenseTrends.map((e) => ({
            status: e.status,
            totalAmount: Number(e.totalAmount || 0),
        }));
    }

    /**
     * Gets tasks distribution by team.
     * Note: Original code counted 'projects' but called it 'taskCount'. Preserving this logic.
     */
    static async getTeamTaskDistribution() {
        // 'projects' relation in Prisma maps to 'tasks' table based on schema inspection.

        const db = await getDb();
        const teamDistribution = await db.select({
            teamName: teams.name,
            taskCount: count(tasks.id),
        })
            .from(teams)
            .leftJoin(tasks, eq(teams.id, tasks.teamId))
            .groupBy(teams.id, teams.name);

        return teamDistribution;
    }
}
