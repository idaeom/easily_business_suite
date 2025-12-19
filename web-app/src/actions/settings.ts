
"use server";

import { getDb } from "@/db";
import { outlets } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getOutlets() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    const db = await getDb();
    return db.query.outlets.findMany({
        orderBy: [desc(outlets.createdAt)]
    });
}

export async function getOutlet(id: string) {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const db = await getDb();
    return db.query.outlets.findFirst({
        where: eq(outlets.id, id)
    });
}

export async function createOutlet(data: {
    name: string;
    address?: string;
    phone?: string;
    loyaltyEarningRate?: string;
    loyaltyRedemptionRate?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

    const db = await getDb();
    const [outlet] = await db.insert(outlets).values({
        name: data.name,
        address: data.address,
        phone: data.phone,
        loyaltyEarningRate: data.loyaltyEarningRate || "0.05",
        loyaltyRedemptionRate: data.loyaltyRedemptionRate || "1.0",
        createdAt: new Date()
    }).returning();

    revalidatePath("/dashboard/settings/outlets");
    return { success: true, outlet };
}

export async function updateOutlet(id: string, data: {
    name?: string;
    address?: string;
    phone?: string;
    loyaltyEarningRate?: string;
    loyaltyRedemptionRate?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

    const db = await getDb();
    await db.update(outlets).set({
        ...data,
        // Ensure rates are strings if passed, or undefined to skip update
        loyaltyEarningRate: data.loyaltyEarningRate,
        loyaltyRedemptionRate: data.loyaltyRedemptionRate
    }).where(eq(outlets.id, id));

    revalidatePath("/dashboard/settings/outlets");
    return { success: true };
}
