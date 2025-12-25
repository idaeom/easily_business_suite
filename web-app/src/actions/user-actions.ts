"use server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyRole } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UserService } from "@/services/user-service";
import { createUserSchema, updateUserRoleSchema, updateUserPermissionsSchema } from "@/lib/dtos/user-dtos";

export async function getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
}) {
    await verifyRole(["ADMIN"]);
    return await UserService.getUsers(params || {});
}

export async function updateUserRole(userId: string, newRole: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "CASHIER" | "USER") {
    await verifyRole(["ADMIN"]);

    // Validate Input
    const data = updateUserRoleSchema.parse({ userId, role: newRole });
    await UserService.updateUserRole(data);

    revalidatePath("/dashboard/settings/users");
    return { success: true };
}

export async function updateUserPermissions(userId: string, permissions: string[]) {
    await verifyRole(["ADMIN", "MANAGER"]);

    const data = updateUserPermissionsSchema.parse({ userId, permissions });
    await UserService.updateUserPermissions(data);

    revalidatePath("/dashboard/settings/users");
    return { success: true };
}

export async function createUser(rawData: any) {
    await verifyRole(["ADMIN"]);

    const data = createUserSchema.parse(rawData);
    await UserService.createUser(data);

    revalidatePath("/dashboard/settings/users");
    return { success: true };
}

export async function deleteUser(userId: string) {
    await verifyRole(["ADMIN"]);
    const db = await getDb();
    await db.delete(users).where(eq(users.id, userId));
    revalidatePath("/dashboard/settings/users");
    return { success: true };
}
