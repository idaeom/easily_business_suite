"use server";

import { getDb } from "@/db";
import { inventory, items, outlets } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { verifyRole } from "@/lib/auth";

export async function getInventoryValuation(outletId?: string) {
    await verifyRole(["ADMIN", "MANAGER", "ACCOUNTANT"]);
    const db = await getDb();

    let query = db.select({
        itemId: items.id,
        itemName: items.name,
        sku: items.sku,
        category: items.category,
        outletName: outlets.name,
        quantity: inventory.quantity,
        costPrice: items.costPrice,
        // Calculate Total Value
        totalValue: sql<number>`${inventory.quantity} * ${items.costPrice}`
    })
        .from(inventory)
        .innerJoin(items, eq(inventory.itemId, items.id))
        .innerJoin(outlets, eq(inventory.outletId, outlets.id));

    if (outletId && outletId !== "ALL") {
        // @ts-ignore - dynamic query construction
        query.where(eq(inventory.outletId, outletId));
    }

    const results = await query;

    // Calculate Summary
    const summary = results.reduce((acc, item) => {
        return {
            totalValue: acc.totalValue + Number(item.totalValue),
            totalItems: acc.totalItems + Number(item.quantity)
        };
    }, { totalValue: 0, totalItems: 0 });

    return {
        data: results,
        summary
    };
}
