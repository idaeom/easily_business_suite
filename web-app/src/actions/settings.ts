"use server";

import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SettingsService } from "@/services/settings-service";
import { createOutletSchema, updateOutletSchema } from "@/lib/dtos/settings-dtos";

export async function getOutlets() {
    const user = await getAuthenticatedUser();
    if (!user) return [];
    return SettingsService.getOutlets();
}

export async function getOutlet(id: string) {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    // Keeping simple getter
    const { getDb } = await import("@/db");
    const { outlets } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    return db.query.outlets.findFirst({ where: eq(outlets.id, id) });
}

export async function createOutlet(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

    const data = createOutletSchema.parse(rawData);
    const [outlet] = await SettingsService.createOutlet(data);

    revalidatePath("/dashboard/settings/outlets");
    return { success: true, outlet };
}

export async function updateOutlet(id: string, rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ADMIN") throw new Error("Unauthorized");

    const data = updateOutletSchema.parse(rawData);
    await SettingsService.updateOutlet(id, data);

    revalidatePath("/dashboard/settings/outlets");
    return { success: true };
}
