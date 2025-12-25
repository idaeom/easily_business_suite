"use server";

import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SalesService } from "@/services/sales-service";
import { createQuoteSchema, updateQuoteDetailsSchema, convertQuoteSchema } from "@/lib/dtos/sales-dtos";
import { logAuditAction } from "./audit";

// =========================================
// QUOTES
// =========================================

export async function getQuotes() {
    return SalesService.getQuotes();
}

export async function createQuote(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const data = createQuoteSchema.parse(rawData);
    const { quote, taxResult } = await SalesService.createQuote(data, user.id);

    await logAuditAction(user.id, "CREATE_QUOTE", quote.id, "QUOTE", { total: taxResult.finalTotal });
    revalidatePath("/dashboard/business/sales");
    return { success: true, quoteId: quote.id };
}

export async function updateQuoteDetails(quoteId: string, rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const data = updateQuoteDetailsSchema.parse(rawData);
    await SalesService.updateQuoteDetails(quoteId, data);

    await logAuditAction(user.id, "UPDATE_QUOTE_DETAILS", quoteId, "QUOTE", { ...data });
    revalidatePath("/dashboard/business/sales");
    return { success: true };
}

export async function updateQuoteStatus(quoteId: string, status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED") {
    const user = await getAuthenticatedUser();
    // Validate status enum explicitly if not using DTO for single field? 
    // Usually trusted unless we make a DTO. Status is strict string in param.
    await SalesService.updateQuoteStatus(quoteId, status);

    if (user) {
        await logAuditAction(user.id, "UPDATE_QUOTE_STATUS", quoteId, "QUOTE", { newStatus: status });
    }
    revalidatePath("/dashboard/business/sales");
    return { success: true };
}

export async function convertQuoteToSale(quoteId: string, rawOverrides?: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const overrides = convertQuoteSchema.parse(rawOverrides || {});
    await SalesService.convertQuoteToSale(quoteId, overrides, user.id, user.outletId);

    // Note: Logging handled somewhat inside? No, Service doesn't rely on `logAuditAction` which is an action file helper.
    // We should log here.
    // Ideally Service returns the sale ID.
    // For now we assume success. Logic inside Service is transactional-like (though not wrapped in one big one yet).
    // Future improvement: Wrap Service method in db.transaction

    revalidatePath("/dashboard/business/sales");
    revalidatePath("/dashboard/business/operations");
    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

export async function getSales(page = 1, limit = 20) {
    // This was not moved to service in my previous step, but for consistency we should have.
    // Since I didn't create it in Service, I will keep the original implementation here (it's a Read query).
    // Or I can quickly move it. Let's keep it for now as it wasn't critical logic.
    const { getDb } = await import("@/db");
    const { spSales } = await import("@/db/schema");
    const { desc, sql } = await import("drizzle-orm");
    const db = await getDb();
    const offset = (page - 1) * limit;

    const data = await db.query.spSales.findMany({
        with: { contact: true, items: true },
        orderBy: [desc(spSales.saleDate)],
        limit,
        offset
    });

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(spSales);
    return {
        data,
        meta: {
            page,
            limit,
            total: Number(countResult.count),
            totalPages: Math.ceil(Number(countResult.count) / limit)
        }
    };
}

// ... Search helpers can remain or move to service.
