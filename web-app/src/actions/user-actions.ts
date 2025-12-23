"use server";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyRole } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";

export async function getUsers() {
    await verifyRole(["ADMIN"]);

    const db = await getDb();
    const allUsers = await db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
    });

    // Remove password hash from response
    return allUsers.map(user => {
        const { password, ...rest } = user;
        return rest;
    });
}

export async function updateUserRole(userId: string, newRole: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "CASHIER" | "USER") {
    // Only Admin can change roles
    await verifyRole(["ADMIN"]);

    const db = await getDb();
    await db.update(users)
        .set({ role: newRole })
        .where(eq(users.id, userId));

    revalidatePath("/dashboard/settings/users");
    return { success: true };
}

export async function updateUserPermissions(userId: string, permissions: string[]) {
    await verifyRole(["ADMIN", "MANAGER"]);
    const db = await getDb();

    await db.update(users)
        .set({ permissions: permissions })
        .where(eq(users.id, userId));

    revalidatePath("/dashboard/settings/users");
    return { success: true };
}



export async function createUser(data: any) {
    await verifyRole(["ADMIN"]);

    const db = await getDb();

    // Check if email exists
    const existing = await db.query.users.findFirst({
        where: eq(users.email, data.email)
    });

    if (existing) {
        throw new Error("User with this email already exists.");
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    await db.insert(users).values({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || "USER",
        outletId: data.outletId || null,
    });

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
