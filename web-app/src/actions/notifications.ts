"use server";

import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

export async function getNotifications() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    const db = await getDb();

    return db.select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(20);
}

export async function markNotificationAsRead(id: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    await db.update(notifications)
        .set({ read: true })
        .where(and(
            eq(notifications.id, id),
            eq(notifications.userId, user.id)
        ));

    return { success: true };
}

export async function markAllNotificationsAsRead() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, user.id));

    return { success: true };
}
