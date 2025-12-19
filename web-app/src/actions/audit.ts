"use server";

import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { desc, eq, and, like, gte, lte, sql } from "drizzle-orm";

export async function getAuditLogs(
    page = 1,
    limit = 50,
    filters?: {
        action?: string;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
    }
) {
    const db = await getDb();
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters?.action) {
        conditions.push(like(sql`lower(${auditLogs.action})`, `%${filters.action.toLowerCase()}%`));
    }

    if (filters?.userId && filters.userId !== "all") {
        conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters?.startDate) {
        conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
        conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.query.auditLogs.findMany({
        where: whereClause,
        limit: limit,
        offset: offset,
        orderBy: [desc(auditLogs.createdAt)],
        with: {
            user: {
                columns: {
                    name: true,
                    email: true,
                    image: true
                }
            }
        }
    });

    const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(whereClause);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
}

export async function logAuditAction(
    userId: string,
    action: string,
    entityId: string,
    entityType: string,
    details?: any
) {
    const db = await getDb();
    await db.insert(auditLogs).values({
        userId,
        action,
        entityId,
        entityType,
        details,
        createdAt: new Date()
    });
}
