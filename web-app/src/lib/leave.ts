
import { getDb } from "@/db";
import { leaveRequests, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export type CreateLeaveInput = {
    userId: string;
    type: "ANNUAL" | "SICK" | "MATERNITY" | "PATERNITY" | "UNPAID" | "CASUAL";
    startDate: Date;
    endDate: Date;
    reason?: string;
};

export class LeaveService {
    static async createRequest(input: CreateLeaveInput) {
        const db = await getDb();
        const [request] = await db.insert(leaveRequests).values({
            userId: input.userId,
            type: input.type,
            startDate: input.startDate,
            endDate: input.endDate,
            reason: input.reason,
            status: "PENDING_CERTIFICATION"
        }).returning();
        return request;
    }

    static async getUserRequests(userId: string) {
        const db = await getDb();
        return db.query.leaveRequests.findMany({
            where: eq(leaveRequests.userId, userId),
            orderBy: [desc(leaveRequests.createdAt)]
        });
    }

    static async getAllRequests() {
        const db = await getDb();
        return db.query.leaveRequests.findMany({
            with: { user: true },
            orderBy: [desc(leaveRequests.createdAt)]
        });
    }

    static async getPendingRequests() {
        const db = await getDb();
        const { inArray } = await import("drizzle-orm");
        return db.query.leaveRequests.findMany({
            where: inArray(leaveRequests.status, ["PENDING_CERTIFICATION", "PENDING_APPROVAL"]),
            with: { user: true },
            orderBy: [desc(leaveRequests.createdAt)]
        });
    }

    static async certifyRequest(requestId: string, certifierId: string) {
        const db = await getDb();
        const [updated] = await db.update(leaveRequests)
            .set({ status: "PENDING_APPROVAL", certifierId })
            .where(eq(leaveRequests.id, requestId))
            .returning();
        return updated;
    }

    static async approveRequest(requestId: string, approverId: string) {
        const db = await getDb();
        const [updated] = await db.update(leaveRequests)
            .set({ status: "APPROVED", approverId })
            .where(eq(leaveRequests.id, requestId))
            .returning();
        return updated;
    }

    static async rejectRequest(requestId: string, approverId: string) {
        const db = await getDb();
        const [updated] = await db.update(leaveRequests)
            .set({ status: "REJECTED", approverId })
            .where(eq(leaveRequests.id, requestId))
            .returning();
        return updated;
    }
}
