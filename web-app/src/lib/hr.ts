import { getDb } from "@/db";
import { eq } from "drizzle-orm";

export type CreateProfileInput = {
    userId: string;
    jobTitle?: string;
    employmentType?: "FULL_TIME" | "CONTRACT" | "INTERN";
    basicSalary?: number | string; // Optional for updates
    housingAllowance?: number;
    transportAllowance?: number;
    otherAllowances?: number;
    bankName?: string;
    accountNumber?: string;
    taxId?: string;
    pensionId?: string;
};

export class HrService {
    static async createOrUpdateProfile(input: CreateProfileInput) {
        const db = await getDb();
        const { employeeProfiles } = await import("@/db/schema");

        const existing = await db.query.employeeProfiles.findFirst({
            where: eq(employeeProfiles.userId, input.userId)
        });

        // Build data object dynamically to handling partial updates
        const data: any = {
            userId: input.userId,
            updatedAt: new Date(),
        };

        if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
        if (input.employmentType !== undefined) data.employmentType = input.employmentType;
        if (input.basicSalary !== undefined) data.basicSalary = input.basicSalary.toString();
        if (input.housingAllowance !== undefined) data.housingAllowance = input.housingAllowance.toString();
        if (input.transportAllowance !== undefined) data.transportAllowance = input.transportAllowance.toString();
        if (input.otherAllowances !== undefined) data.otherAllowances = input.otherAllowances.toString();
        if (input.bankName !== undefined) data.bankName = input.bankName;
        if (input.accountNumber !== undefined) data.accountNumber = input.accountNumber;
        if (input.taxId !== undefined) data.taxId = input.taxId;
        if (input.pensionId !== undefined) data.pensionId = input.pensionId;

        if (existing) {
            await db.update(employeeProfiles)
                .set(data)
                .where(eq(employeeProfiles.id, existing.id));
            return { ...existing, ...data };
        } else {
            // Validations for creation
            if (!data.basicSalary) data.basicSalary = "0"; // Default or Error? Defaulting for robustness

            const [newProfile] = await db.insert(employeeProfiles).values({
                ...data,
                // ID is auto-generated
            }).returning();
            return newProfile;
        }
    }

    static async getProfile(userId: string) {
        const db = await getDb();
        const { employeeProfiles } = await import("@/db/schema");
        return db.query.employeeProfiles.findFirst({
            where: eq(employeeProfiles.userId, userId),
            with: { user: true }
        });
    }

    static async getAllEmployees() {
        const db = await getDb();
        const { users, employeeProfiles, teams } = await import("@/db/schema");
        const { eq, aliasedTable } = await import("drizzle-orm");

        try {
            // Use Explicit Aliases to prevent Table Name / Alias confusion in Generated SQL
            const ep = aliasedTable(employeeProfiles, "ep");
            const t = aliasedTable(teams, "t");

            const rows = await db.select({
                user: users,
                profile: ep,
                team: t
            })
                .from(users)
                .leftJoin(ep, eq(users.id, ep.userId))
                .leftJoin(t, eq(users.teamId, t.id));

            return rows.map(r => ({
                ...r.user,
                employeeProfile: r.profile,
                team: r.team
            }));
        } catch (error: any) {
            console.error("[HrService.getAllEmployees] CRITICAL DB ERROR:", error);
            if (error.cause) console.error("[HrService.getAllEmployees] CAUSE:", error.cause);
            throw error;
        }
    }
}

export class ProfileChangeService {
    static async requestChange(requesterId: string, employeeId: string, data: any) {
        const db = await getDb();
        const { profileChangeRequests } = await import("@/db/schema");

        const [request] = await db.insert(profileChangeRequests).values({
            userId: employeeId,
            requesterId: requesterId,
            data: data,
            status: "PENDING_CERTIFICATION"
        }).returning();

        return request;
    }

    static async getPendingRequests() {
        const db = await getDb();
        const { profileChangeRequests, users } = await import("@/db/schema");
        const { desc } = await import("drizzle-orm");

        return db.query.profileChangeRequests.findMany({
            where: (req, { inArray }) => inArray(req.status, ["PENDING_CERTIFICATION", "PENDING_APPROVAL"]),
            with: {
                user: true, // Employee
                // requester: true 
            },
            orderBy: [desc(profileChangeRequests.createdAt)]
        });
    }

    static async certifyRequest(requestId: string, certifierId: string) {
        const db = await getDb();
        const { profileChangeRequests } = await import("@/db/schema");

        await db.update(profileChangeRequests)
            .set({
                status: "PENDING_APPROVAL",
                certifierId: certifierId,
                updatedAt: new Date()
            })
            .where(eq(profileChangeRequests.id, requestId));
    }

    static async approveRequest(requestId: string, approverId: string) {
        const db = await getDb();
        const { profileChangeRequests } = await import("@/db/schema");

        // 1. Fetch Request Data
        const request = await db.query.profileChangeRequests.findFirst({
            where: eq(profileChangeRequests.id, requestId)
        });

        if (!request) throw new Error("Request not found");
        if (request.status !== "PENDING_APPROVAL") throw new Error("Request must be certified first");

        // 2. Apply Changes to Profile
        await HrService.createOrUpdateProfile({
            userId: request.userId,
            ...request.data as any // Safe spread of JSON data
        });

        // 3. Update Request Status
        await db.update(profileChangeRequests)
            .set({
                status: "APPROVED",
                approverId: approverId,
                updatedAt: new Date()
            })
            .where(eq(profileChangeRequests.id, requestId));
    }

    static async rejectRequest(requestId: string, rejectorId: string, reason: string) {
        const db = await getDb();
        const { profileChangeRequests } = await import("@/db/schema");

        await db.update(profileChangeRequests)
            .set({
                status: "REJECTED",
                rejectionReason: reason,
                updatedAt: new Date()
            })
            .where(eq(profileChangeRequests.id, requestId));
    }
}
