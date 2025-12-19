"use server";

import { getDb } from "@/db";
import { users, outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth"; // Assuming this helper exists and handles auth
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: "ADMIN" | "USER") {
    // 1. Authentication & Authorization
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) throw new Error("Unauthorized");

    if (currentUser.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can update roles.");
    }

    // 2. Prevent Self-Lockout (Optional but recommended)
    if (currentUser.id === userId && newRole !== "ADMIN") {
        throw new Error("Safety: You cannot remove your own Admin privileges.");
    }

    // 3. Update Role
    const db = await getDb();
    await db.update(users)
        .set({ role: newRole })
        .where(eq(users.id, userId));

    // 4. Revalidate
    revalidatePath("/dashboard/settings/users");

    return { success: true };
}

export async function updateUserPermissions(userId: string, permissions: string[]) {
    // 1. Authentication & Authorization
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) throw new Error("Unauthorized");

    if (currentUser.role !== "ADMIN") {
        throw new Error("Unauthorized: Only Admins can update permissions.");
    }

    // 2. Update Permissions
    const db = await getDb();
    await db.update(users)
        .set({ permissions })
        .where(eq(users.id, userId));

    // 3. Revalidate
    revalidatePath("/dashboard/settings/users");

    return { success: true };
}

export async function switchUserBranch(outletId: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // Phase 1: Admins can switch freely.
    if (user.role !== "ADMIN") {
        throw new Error("Only Admins can switch branches dynamically.");
    }

    const db = await getDb();

    // Verify outlet exists
    const outlet = await db.query.outlets.findFirst({
        where: eq(outlets.id, outletId)
    });
    if (!outlet) throw new Error("Branch not found");

    await db.update(users)
        .set({ outletId: outletId })
        .where(eq(users.id, user.id));

    revalidatePath("/dashboard");
    return { success: true };
}
