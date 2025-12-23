"use server";

import { getDb } from "@/db";
import { itemCategories } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export type CategoryTemplateType = "RETAIL" | "RESTAURANT" | "SUPERMARKET" | "SERVICE" | "PHARMACY";

const TEMPLATES: Record<CategoryTemplateType, string[]> = {
    RETAIL: ["Clothing", "Shoes", "Accessories", "Electronics", "Home Goods", "Beauty", "Kids", "Sports", "Gifts"],
    RESTAURANT: ["Starters", "Mains", "Desserts", "Beverages", "Alcohol", "Side Dishes", "Specials"],
    SUPERMARKET: ["Produce", "Dairy", "Meat", "Frozen", "Bakery", "Canned Goods", "Snacks", "Beverages", "Household", "Personal Care"],
    SERVICE: ["Consultation", "Labor", "Installation", "Support", "Training", "Development", "Design"],
    PHARMACY: ["Drugs", "Supplements", "Personal Care", "Medical Supplies", "First Aid", "Baby Care"]
};

export async function initializeItemCategories(template: CategoryTemplateType) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_ITEMS");

    const db = await getDb();

    const categoriesToCreate = TEMPLATES[template] || [];
    let createdCount = 0;

    for (const name of categoriesToCreate) {
        try {
            await db.insert(itemCategories).values({
                name: name,
                businessType: template,
                description: `Standard category for ${template.toLowerCase()} business.`
            }).onConflictDoNothing();
            createdCount++;
        } catch (e) {
            console.error(`Failed to insert category ${name}`, e);
        }
    }

    revalidatePath("/dashboard/settings/product-categories");
    revalidatePath("/dashboard/business/inventory");

    return { success: true, count: createdCount };
}

export async function getItemCategories() {
    const db = await getDb();
    return await db.query.itemCategories.findMany();
}

export async function createItemCategory(name: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_ITEMS");

    const db = await getDb();

    await db.insert(itemCategories).values({
        name,
        description: "Custom category"
    });

    revalidatePath("/dashboard/settings/product-categories");
    return { success: true };
}

export async function deleteItemCategory(id: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_ITEMS");

    const db = await getDb();

    await db.delete(itemCategories).where(eq(itemCategories.id, id));

    revalidatePath("/dashboard/settings/product-categories");
    return { success: true };
}
