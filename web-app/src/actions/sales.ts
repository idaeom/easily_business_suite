"use server";

import { getDb } from "@/db";
import { spQuotes, spQuoteItems, contacts, items, spSales, spSaleItems, auditLogs, transactions, ledgerEntries, accounts, dispatches, customerLedgerEntries, inventory, outlets } from "@/db/schema";
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

export async function getSales(page = 1, limit = 20) {
    const db = await getDb();
    const offset = (page - 1) * limit;

    const data = await db.query.spSales.findMany({
        with: {
            contact: true,
            items: true
        },
        orderBy: [desc(spSales.saleDate)],
        limit,
        offset
    });

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(spSales);

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

import { calculateTax } from "@/lib/utils/tax-utils";
import { salesTaxes } from "@/db/schema";

// ... existing imports

export async function createQuote(data: {
    contactId: string;
    customerName: string;
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

    // Fetch Enabled Taxes
    const taxes = await db.select().from(salesTaxes).where(eq(salesTaxes.isEnabled, true));

    // Calculate Tax using Util
    const taxResult = calculateTax(subtotal, taxes);

    // Create Quote
    const [quote] = await db.insert(spQuotes).values([{
        contactId: data.contactId,
        customerName: data.customerName,
        quoteDate: new Date(),
        validUntil: data.validUntil,
        subtotal: subtotal.toString(),
        tax: taxResult.totalTax.toString(),
        total: taxResult.finalTotal.toString(),
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

    await logAuditAction(user.id, "CREATE_QUOTE", quote.id, "QUOTE", { total: taxResult.finalTotal });

    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/business/sales");
    }
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

    const subtotal = Number(quote.subtotal);

    // Fetch Active Taxes
    const taxes = await db.select().from(salesTaxes).where(eq(salesTaxes.isEnabled, true));
    const taxResult = calculateTax(subtotal, taxes);

    const loyaltyValue = loyaltyPointsUsed * 1;

    // Final Total check
    let total = taxResult.finalTotal - discountAmount - loyaltyValue;
    if (total < 0) total = 0;

    // Determine Outlet (User's or Default to First/Main)
    let targetOutletId = user.outletId;
    if (!targetOutletId) {
        const allOutlets = await db.query.outlets.findMany({ limit: 1 });
        if (allOutlets.length > 0) {
            targetOutletId = allOutlets[0].id;
        }
    }

    // 3. Create Sale
    const [sale] = await db.insert(spSales).values([{
        contactId: quote.contactId,
        customerName: quote.customerName,
        saleDate: new Date(),
        subtotal: subtotal.toString(),
        tax: taxResult.totalTax.toString(),
        total: total.toString(),
        status: "CONFIRMED",
        notes: `Converted from Quote #${quoteId.slice(0, 8)}. Discount: ${discountAmount}, Points: ${loyaltyPointsUsed}`,
        deliveryMethod: quote.deliveryMethod,
        createdById: user.id,
        outletId: targetOutletId
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

        // Update Inventory (if Outlet Linked or Defaulted)
        if (targetOutletId) {
            for (const item of quote.items) {
                const qty = Number(item.quantity);

                // Atomic Decrement
                const result = await db.update(inventory)
                    .set({ quantity: sql`${inventory.quantity} - ${qty}` })
                    .where(and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, targetOutletId)))
                    .returning();

                // If no row exists, create one (Negative Stock)
                if (result.length === 0) {
                    await db.insert(inventory).values({
                        itemId: item.itemId,
                        outletId: targetOutletId,
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



    // 6. Handle Loyalty Deduction & Wallet Logic (Customer Ledger)
    const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, quote.contactId)
    });

    if (contact) {
        // A. Loyalty Deduction (Usage)
        if (loyaltyPointsUsed > 0) {
            const currentPoints = Number(contact.loyaltyPoints || 0);
            const newPoints = currentPoints - loyaltyPointsUsed;
            await db.update(contacts)
                .set({ loyaltyPoints: newPoints.toString() })
                .where(eq(contacts.id, contact.id));
        }

        // B. Loyalty Earning (New)
        if (user.outletId) {
            const outlet = await db.query.outlets.findFirst({
                where: eq(outlets.id, user.outletId)
            });
            const earningRate = Number(outlet?.loyaltyEarningRate ?? "0.05"); // Default 5%
            const earnedPoints = Number((Number(sale.total) * earningRate).toFixed(2));

            if (earnedPoints > 0) {
                await db.update(contacts)
                    .set({ loyaltyPoints: sql`${contacts.loyaltyPoints} + ${earnedPoints}` })
                    .where(eq(contacts.id, contact.id));
            }
        }


        // C. Wallet Balance Update
        const currentBalance = Number(contact.walletBalance || 0);
        // "total" here is the Invoice Amount. 
        const newBalance = currentBalance - total;

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

    // =========================================================================
    // GENERAL LEDGER POSTING (DOUBLE ENTRY)
    // =========================================================================
    // 1. Credit Sales Revenue (Income)
    // 2. Debit Logic: Split between Customer Pre-Deposits (Liability) and AR (Asset)

    const glTxId = crypto.randomUUID();
    await db.insert(transactions).values({
        id: glTxId,
        date: new Date(),
        description: `Invoice #${sale.id.slice(0, 8)} - ${quote.customerName}`,
        status: "POSTED",
        reference: sale.id,
        metadata: { type: "SALE", saleId: sale.id }
    });

    // CREDIT: Split Revenue and Tax
    // 1. Sales Revenue (Subtotal)
    const salesAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "4000") });
    // Fallback to searching by name if code differs
    const finalSalesAccount = salesAccount || await db.query.accounts.findFirst({ where: eq(accounts.type, "INCOME") });

    if (finalSalesAccount) {
        await db.insert(ledgerEntries).values({
            transactionId: glTxId,
            accountId: finalSalesAccount.id,
            amount: sale.subtotal, // Only Subtotal goes to Revenue
            direction: "CREDIT",
            description: "Revenue Recognized"
        });
        await db.execute(sql`UPDATE "Account" SET balance = balance + ${sale.subtotal} WHERE id = ${finalSalesAccount.id}`);
    }

    // 2. VAT Output (Tax)
    const taxAmount = Number(sale.tax);
    if (taxAmount > 0) {
        // Find VAT Output Account (2350)
        let vatAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "2350") });
        if (!vatAccount) {
            vatAccount = await db.query.accounts.findFirst({ where: and(eq(accounts.type, "LIABILITY"), like(accounts.name, "%VAT%")) });
        }

        if (vatAccount) {
            await db.insert(ledgerEntries).values({
                transactionId: glTxId,
                accountId: vatAccount.id,
                amount: taxAmount.toString(),
                direction: "CREDIT",
                description: "VAT Output Liability"
            });
            // Credit Liability = Increase Balance
            await db.execute(sql`UPDATE "Account" SET balance = balance + ${taxAmount.toString()} WHERE id = ${vatAccount.id}`);
        } else {
            // Fallback: Add to Revenue if no VAT account (Not ideal but keeps balance)
            if (finalSalesAccount) {
                await db.insert(ledgerEntries).values({
                    transactionId: glTxId,
                    accountId: finalSalesAccount.id,
                    amount: taxAmount.toString(),
                    direction: "CREDIT",
                    description: "VAT (Merged to Revenue - No Tax Account)"
                });
                await db.execute(sql`UPDATE "Account" SET balance = balance + ${taxAmount.toString()} WHERE id = ${finalSalesAccount.id}`);
            }
        }
    }

    // DEBIT: SPLIT LOGIC
    // We determine how much of the "total" was covered by existing positive wallet balance.
    const currentBalance = Number(contact?.walletBalance || 0);

    // Amount covered by Wallet Liability (Pre-Deposit)
    const amountFromWallet = Math.min(Number(sale.total), Math.max(0, currentBalance));

    // Amount remaining as Credit (Accounts Receivable)
    const amountOnCredit = Number(sale.total) - amountFromWallet;

    // 1. Debit "Customer Deposits" (Liability) for the funded portion
    if (amountFromWallet > 0) {
        // Find Liability Account (2300)
        let depAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "2300") });
        // Fallback: try finding any Liability with "Deposit" or "Wallet"
        if (!depAccount) {
            depAccount = await db.query.accounts.findFirst({
                where: and(eq(accounts.type, "LIABILITY"), like(accounts.name, "%Deposit%"))
            });
        }

        if (depAccount) {
            await db.insert(ledgerEntries).values({
                transactionId: glTxId,
                accountId: depAccount.id,
                amount: amountFromWallet.toString(),
                direction: "DEBIT",
                description: `Payment from Wallet Balance`
            });
            // Debit Liability = DECREASE Balance
            await db.execute(sql`UPDATE "Account" SET balance = balance - ${amountFromWallet.toString()} WHERE id = ${depAccount.id}`);
        } else {
            // Fallback to AR if no Liability account exists, to ensure Transaction balances
            const arAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1100") });
            if (arAccount) {
                await db.insert(ledgerEntries).values({
                    transactionId: glTxId,
                    accountId: arAccount.id,
                    amount: amountFromWallet.toString(),
                    direction: "DEBIT",
                    description: `Wallet Payment (Fallback AR)`
                });
                await db.execute(sql`UPDATE "Account" SET balance = balance + ${amountFromWallet.toString()} WHERE id = ${arAccount.id}`);
            }
        }
    }

    // 2. Debit "Accounts Receivable" (Asset) for the remainder
    if (amountOnCredit > 0) {
        const arAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1100") });
        const debitAccount = arAccount || await db.query.accounts.findFirst({ where: eq(accounts.type, "ASSET") });

        if (debitAccount) {
            await db.insert(ledgerEntries).values({
                transactionId: glTxId,
                accountId: debitAccount.id,
                amount: amountOnCredit.toString(),
                direction: "DEBIT",
                description: `Invoice Charged to ${quote.customerName}`
            });
            // Debit Asset = INCREASE Balance
            await db.execute(sql`UPDATE "Account" SET balance = balance + ${amountOnCredit.toString()} WHERE id = ${debitAccount.id}`);
        }
    }


    // 7. Auto-create Dispatch Record
    const deliveryAddress = contact?.address || "Customer Address";

    await db.insert(dispatches).values([{
        salesId: sale.id,
        contactId: quote.contactId,
        outletId: user.outletId,
        deliveryMethod: quote.deliveryMethod,
        deliveryAddress: deliveryAddress,
        status: "PENDING",
        dispatchDate: new Date()
    }]);

    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/business/sales");
        revalidatePath("/dashboard/business/operations");
        revalidatePath("/dashboard/business/inventory");
    }
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
