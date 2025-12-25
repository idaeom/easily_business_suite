"use server";

import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { HrService } from "@/services/hr-service";
import { createEmployeeProfileSchema, updateEmployeeProfileSchema } from "@/lib/dtos/hr-dtos";

export async function getEmployees() {
    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_EMPLOYEES");
    return HrService.getEmployees();
}

export async function createEmployeeProfile(rawData: any) {
    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_EMPLOYEES");

    const data = createEmployeeProfileSchema.parse(rawData);
    await HrService.createEmployeeProfile(data);

    revalidatePath("/dashboard/hr/employees");
    return { success: true };
}

export async function updateEmployeeProfile(userId: string, rawData: any) {
    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("MANAGE_EMPLOYEES");

    const data = updateEmployeeProfileSchema.parse(rawData);
    await HrService.updateEmployeeProfile(userId, data);

    revalidatePath("/dashboard/hr/employees");
    return { success: true };
}

// Getters
export async function getUsersForOnboarding() {
    const { getDb } = await import("@/db");
    const { users, employeeProfiles } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");

    // This logic logic remains simple (Query) so keeping here or move to Service if reusable.
    const db = await getDb();
    return db.query.users.findMany({
        where: (users, { notExists }) => notExists(
            db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, users.id))
        ),
        orderBy: [desc(users.createdAt)]
    });
}

export async function getEmployeeById(id: string) {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    return db.query.users.findFirst({
        where: eq(users.id, id),
        with: { employeeProfile: true, team: true }
    });
}
