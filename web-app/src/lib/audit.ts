import { getDb, liveDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

// Define a type that works for both the global DB and a Transaction scope
type DbTransaction = Parameters<Parameters<typeof liveDb.transaction>[0]>[0];
type DbOrTx = typeof liveDb | DbTransaction;

export class AuditService {
    /**
     * Records an audit log entry.
     * @param userId The ID of the user performing the action.
     * @param action The action being performed (e.g., "CREATE_TASK").
     * @param entityType The type of entity affected (e.g., "Task").
     * @param entityId The ID of the affected entity.
     * @param details Optional details or JSON object about the action.
     * @param tx Optional: The transaction client. If provided, log is atomic.
     */
    static async log(
        userId: string,
        action: string,
        entityType: string,
        entityId: string,
        details?: Record<string, any>,
        tx?: DbOrTx
    ) {
        // Use the transaction if provided, otherwise use global db
        const executor = tx ?? (await getDb());

        // Strict Error Propagation: If logging fails, the parent action MUST fail.
        await executor.insert(auditLogs).values({
            userId,
            action,
            entityType,
            entityId,
            details: details ?? null,
        });
    }

    /**
     * Retrieves audit logs for a specific entity.
     */
    static async getLogsForEntity(entityType: string, entityId: string) {
        const db = await getDb();
        return db.query.auditLogs.findMany({
            where: and(
                eq(auditLogs.entityType, entityType),
                eq(auditLogs.entityId, entityId)
            ),
            orderBy: [desc(auditLogs.createdAt)],
            with: {
                user: {
                    columns: { id: true, name: true, email: true, role: true }
                }
            }
        });
    }

    /**
     * Retrieves recent audit logs for the system.
     */
    static async getRecentLogs(limit = 50) {
        const db = await getDb();
        return db.query.auditLogs.findMany({
            orderBy: [desc(auditLogs.createdAt)],
            limit: limit,
            with: {
                user: {
                    columns: { id: true, name: true, email: true }
                }
            }
        });
    }
}
