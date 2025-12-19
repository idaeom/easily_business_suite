"use server";

import { getDb } from "@/db";
import { spQuotes, spQuoteItems, contacts, items, spSales, spSaleItems, auditLogs, transactions, ledgerEntries, accounts, dispatches, customerLedgerEntries, inventory } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, desc, asc, like, ilike, or, and, lt, sql } from "drizzle-orm";
import { Contact, SpQuote, SpSale } from "@/db/schema";
import { logAuditAction } from "./audit";

// =========================================
// QUOTES
// =========================================

export async function getQuotes() {
    const db = await getDb();

    // Lazy Expiration Check
    const now = new Date();
    await db.update(spQuotes)
        .set({ status: "EXPIRED" })
        .where(
            and(
                lt(spQuotes.validUntil, now),
                or(eq(spQuotes.status, "DRAFT"), eq(spQuotes.status, "SENT"))
            )
        );

    const quotes = await db.query.spQuotes.findMany({
        with: {
            contact: true,
            items: true
        },
        orderBy: [desc(spQuotes.createdAt)]
    });
    return quotes;
}

export async function getSales() {
    const db = await getDb();
    const sales = await db.query.spSales.findMany({
        with: {
            contact: true,
            items: true
        },
        orderBy: [desc(spSales.saleDate)]
    });
    return sales;
}

export async function createQuote(data: {
    contactId: string;
    customerName: string; // Redundant but good for snapshot
    items: { itemId: string; itemName: string; quantity: number; unitPrice: number }[];
    validUntil?: Date;
    notes?: string;
    deliveryMethod?: "DELIVERY" | "PICKUP";
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    // Calculate Totals
    let subtotal = 0;
    const quoteItemsData = data.items.map(item => {
        const total = item.quantity * item.unitPrice;
        subtotal += total;
        return {
            ...item,
            total: total.toString(),
            unitPrice: item.unitPrice.toString()
        };
    });

    const tax = 0; // Configurable later
    const total = subtotal + tax;

    // Create Quote
    const [quote] = await db.insert(spQuotes).values([{
        contactId: data.contactId,
        customerName: data.customerName,
        quoteDate: new Date(),
        validUntil: data.validUntil,
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        total: total.toString(),
        status: "DRAFT",
        notes: data.notes,
        createdById: user.id,
        deliveryMethod: data.deliveryMethod || "DELIVERY"
    }]).returning();

    // Create Items
    if (quoteItemsData.length > 0) {
        await db.insert(spQuoteItems).values(
            quoteItemsData.map(item => ({
                quoteId: quote.id,
                itemId: item.itemId,
                itemName: item.itemName,
                quantity: item.quantity.toString(),
                unitPrice: item.unitPrice,
                total: item.total
            }))
        );
    }

    await logAuditAction(user.id, "CREATE_QUOTE", quote.id, "QUOTE", { total });

    revalidatePath("/dashboard/business/sales");
    return { success: true, quoteId: quote.id };
}

export async function updateQuoteDetails(quoteId: string, data: { notes?: string; discountAmount?: number; loyaltyPointsUsed?: number, deliveryMethod?: "DELIVERY" | "PICKUP" }) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    await db.update(spQuotes)
        .set({
            notes: data.notes,
            discountAmount: data.discountAmount ? data.discountAmount.toString() : "0",
            loyaltyPointsUsed: data.loyaltyPointsUsed ? data.loyaltyPointsUsed.toString() : "0",
            deliveryMethod: data.deliveryMethod || "DELIVERY"
        })
        .where(eq(spQuotes.id, quoteId));

    await logAuditAction(user.id, "UPDATE_QUOTE_DETAILS", quoteId, "QUOTE", { ...data });

    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/business/sales");
    }
    return { success: true };
}

export async function updateQuoteStatus(quoteId: string, status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED") {
    const user = await getAuthenticatedUser();
    const db = await getDb();
    await db.update(spQuotes)
        .set({ status })
        .where(eq(spQuotes.id, quoteId));

    if (user) {
        await logAuditAction(user.id, "UPDATE_QUOTE_STATUS", quoteId, "QUOTE", { newStatus: status });
    }

    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/business/sales");
    }
    return { success: true };
}

export async function convertQuoteToSale(quoteId: string, overrides?: { discountAmount?: number; loyaltyPointsUsed?: number }) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    // 1. Fetch Quote
    const quote = await db.query.spQuotes.findFirst({
        where: eq(spQuotes.id, quoteId),
        with: { items: true }
    });

    if (!quote) throw new Error("Quote not found");
    if (quote.status !== "ACCEPTED") throw new Error("Quote must be accepted first");


    // 2. Logic for Overrides & Totals
    const discountAmount = overrides?.discountAmount ?? Number(quote.discountAmount || 0);
    const loyaltyPointsUsed = overrides?.loyaltyPointsUsed ?? Number(quote.loyaltyPointsUsed || 0);

    // Loyalty Value (Assuming 1 Point = 1 Currency Unit for now, ideally fetched from Settings)
    const loyaltyValue = loyaltyPointsUsed * 1;

    // Recalculate Total
    const subtotal = Number(quote.subtotal);
    const tax = Number(quote.tax);
    let total = subtotal + tax - discountAmount - loyaltyValue;
    if (total < 0) total = 0;


    // 3. Create Sale
    const [sale] = await db.insert(spSales).values([{
        contactId: quote.contactId,
        customerName: quote.customerName,
        saleDate: new Date(),
        subtotal: quote.subtotal, // Base Amount
        tax: quote.tax,
        total: total.toString(), // Final Amount after discounts
        status: "CONFIRMED",
        notes: `Converted from Quote #${quoteId.slice(0, 8)}. Discount: ${discountAmount}, Points: ${loyaltyPointsUsed}`,
        deliveryMethod: quote.deliveryMethod,
        createdById: user.id,
        outletId: user.outletId // Scope to branch
    }]).returning();

    // 4. Create Sale Items & Update Inventory
    if (quote.items.length > 0) {
        // Insert Sale Items
        await db.insert(spSaleItems).values(
            quote.items.map(item => ({
                saleId: sale.id,
                itemId: item.itemId,
                itemName: item.itemName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total
            }))
        );

        // Update Inventory (if Outlet Linked)
        if (user.outletId) {
            for (const item of quote.items) {
                const qty = Number(item.quantity);

                // Atomic Decrement
                const result = await db.update(inventory)
                    .set({ quantity: sql`${inventory.quantity} - ${qty}` })
                    .where(and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, user.outletId)))
                    .returning();

                // If no row exists, create one (Negative Stock)
                if (result.length === 0) {
                    await db.insert(inventory).values({
                        itemId: item.itemId,
                        outletId: user.outletId,
                        quantity: (0 - qty).toString()
                    });
                }
            }
        }
    }


    await logAuditAction(user.id, "CONVERT_QUOTE_TO_SALE", sale.id, "SALE", { quoteId, discountAmount, loyaltyPointsUsed });

    // 5. Update Status to CONVERTED
    await db.update(spQuotes)
        .set({ status: "CONVERTED" })
        .where(eq(spQuotes.id, quoteId));


    // 6. Handle Loyalty Deduction & Wallet
    const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, quote.contactId)
    });

    if (contact) {
        // Deduct Loyalty Points
        if (loyaltyPointsUsed > 0) {
            const currentPoints = Number(contact.loyaltyPoints || 0);
            const newPoints = currentPoints - loyaltyPointsUsed;
            await db.update(contacts)
                .set({ loyaltyPoints: newPoints.toString() })
                .where(eq(contacts.id, contact.id));
        }

        // Ledger Entry (Debit Customer)
        const currentBalance = Number(contact.walletBalance || 0);
        const newBalance = currentBalance - total; // Debit reduces credits or increases debt

        await db.insert(customerLedgerEntries).values([{
            contactId: quote.contactId,
            saleId: sale.id,
            entryDate: new Date(),
            description: `Sale Invoice #${sale.id.slice(0, 8)}`,
            debit: total.toString(),
            credit: "0",
            balanceAfter: newBalance.toString()
        }]);

        // Update Wallet Balance
        await db.update(contacts)
            .set({ walletBalance: newBalance.toString() })
            .where(eq(contacts.id, quote.contactId));
    }


    // 7. Auto-create Dispatch Record
    await db.insert(dispatches).values([{
        salesId: sale.id,
        contactId: quote.contactId,
        outletId: user.outletId,
        deliveryMethod: quote.deliveryMethod,
        deliveryAddress: "Customer Address", // Placeholder
        status: "PENDING",
        dispatchDate: new Date()
    }]);

    revalidatePath("/dashboard/business/sales");
    revalidatePath("/dashboard/business/operations");
    return { success: true, saleId: sale.id };
}

// =========================================
// CONTACTS (CUSTOMERS)
// =========================================

export async function searchCustomers(query: string) {
    const db = await getDb();
    if (!query) return [];

    const results = await db.query.contacts.findMany({
        where: or(
            ilike(contacts.name, `%${query}%`),
            ilike(contacts.phone, `%${query}%`)
        ),
        limit: 10
    });

    return results.filter(c => c.type === "CUSTOMER" || c.type === "BOTH");
}

export async function createQuickCustomer(data: { name: string; phone: string }) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    // Check if phone exists
    const existing = await db.query.contacts.findFirst({
        where: eq(contacts.phone, data.phone)
    });

    if (existing) {
        if (existing.type === "VENDOR") {
            // Upgrade to BOTH? For now just error or return existing
            // Let's assume we return it but warn? 
            // Ideally we should auto-upgrade but let's keep it simple.
            return { success: true, contact: existing };
        }
        return { success: true, contact: existing };
    }

    const [contact] = await db.insert(contacts).values([{
        name: data.name,
        phone: data.phone,
        type: "CUSTOMER",
        companyName: data.name, // Default
        salesRepId: user.id
    }]).returning();

    return { success: true, contact };
}

// =========================================
// ITEMS
// =========================================

export async function searchItems(query: string) {
    const db = await getDb();
    const results = await db.query.items.findMany({
        where: ilike(items.name, `%${query}%`),
        limit: 20
    });
    return results.filter(i => ["RESALE", "MANUFACTURED", "SERVICE"].includes(i.itemType));
}
