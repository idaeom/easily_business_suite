
"use server";

import { getDb } from "@/db";
import { salesTaxes, discounts, outlets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ===========================================
// TAXES
// ===========================================

export async function getSalesTaxes() {
    const db = await getDb();
    return db.query.salesTaxes.findMany({
        orderBy: [desc(salesTaxes.name)],
    });
}

export async function saveSalesTax(data: {
    id?: string;
    name: string;
    rate: number;
    type: "INCLUSIVE" | "EXCLUSIVE";
    isEnabled: boolean;
}) {
    const db = await getDb();

    if (data.id) {
        // Update
        await db.update(salesTaxes).set({
            name: data.name,
            rate: data.rate.toString(),
            type: data.type,
            isEnabled: data.isEnabled
        }).where(eq(salesTaxes.id, data.id));
    } else {
        // Create
        await db.insert(salesTaxes).values({
            name: data.name,
            rate: data.rate.toString(),
            type: data.type,
            isEnabled: data.isEnabled
        });
    }
    revalidatePath("/dashboard/settings/taxes");
    return { success: true };
}

export async function deleteSalesTax(id: string) {
    const db = await getDb();
    await db.delete(salesTaxes).where(eq(salesTaxes.id, id));
    revalidatePath("/dashboard/settings/taxes");
    return { success: true };
}

// ===========================================
// DISCOUNTS
// ===========================================

export async function getDiscounts() {
    const db = await getDb();
    return db.query.discounts.findMany({
        orderBy: [desc(discounts.name)],
    });
}

export async function saveDiscount(data: {
    id?: string;
    name: string;
    type: "PERCENTAGE" | "FIXED";
    value: number;
    isEnabled: boolean;
}) {
    const db = await getDb();

    if (data.id) {
        await db.update(discounts).set({
            name: data.name,
            type: data.type,
            value: data.value.toString(),
            isEnabled: data.isEnabled
        }).where(eq(discounts.id, data.id));
    } else {
        await db.insert(discounts).values({
            name: data.name,
            type: data.type,
            value: data.value.toString(),
            isEnabled: data.isEnabled
        });
    }
    revalidatePath("/dashboard/settings/discounts");
    return { success: true };
}

export async function deleteDiscount(id: string) {
    const db = await getDb();
    await db.delete(discounts).where(eq(discounts.id, id));
    revalidatePath("/dashboard/settings/discounts");
    return { success: true };
}

// ===========================================
// LOYALTY (Outlet Defaults)
// ===========================================

export async function getLoyaltySettings(outletId: string) {
    const db = await getDb();
    const outlet = await db.query.outlets.findFirst({
        where: eq(outlets.id, outletId),
        columns: {
            loyaltyEarningRate: true,
            loyaltyRedemptionRate: true
        }
    });
    return outlet;
}

export async function saveLoyaltySettings(outletId: string, earningRate: number, redemptionRate: number) {
    const db = await getDb();
    await db.update(outlets).set({
        loyaltyEarningRate: earningRate.toString(),
        loyaltyRedemptionRate: redemptionRate.toString()
    }).where(eq(outlets.id, outletId));
    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/settings/loyalty");
    }
    return { success: true };
}
