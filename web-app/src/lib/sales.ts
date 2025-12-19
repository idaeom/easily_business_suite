import { getDb } from "@/db";
import {
    items, contacts, spQuotes, spQuoteItems, spSales, spSaleItems,
    outlets, users
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export class SalesService {
    // ===========================
    // CUSTOMERS (Managed via Contacts)
    // ===========================
    static async createCustomer(data: { name: string, phone: string, email?: string, address?: string, salesRepId?: string }) {
        const db = await getDb();
        // Minimal validation: Name and Phone required by type definition.
        const [customer] = await db.insert(contacts).values({
            ...data,
            type: "CUSTOMER",
            companyName: data.name // Default company name to name for simple parity
        }).returning();
        return customer;
    }

    static async getCustomers() {
        const db = await getDb();
        return db.query.contacts.findMany({
            where: eq(contacts.type, "CUSTOMER"),
            orderBy: [desc(contacts.createdAt)]
        });
    }

    // ===========================
    // ITEMS
    // ===========================
    static async createItem(data: { name: string, price: number, costPrice: number, category: string, itemType: "RESALE" | "INTERNAL_USE", sku?: string }) {
        const db = await getDb();
        const [item] = await db.insert(items).values({
            ...data,
            price: data.price.toString(),
            costPrice: data.costPrice.toString()
        }).returning();
        return item;
    }

    static async getItems() {
        const db = await getDb();
        return db.query.items.findMany();
    }

    // ===========================
    // SALES
    // ===========================
    static async createSale(input: {
        customerId: string, // Kept param name for compatibility, maps to contactId
        items: { itemId: string, quantity: number, unitPrice: number }[],
        createdById: string,
        notes?: string,
        dueDate?: Date
    }) {
        const db = await getDb();

        // Calculate Totals
        let subtotal = 0;
        const lineItems = input.items.map(i => {
            const total = i.quantity * i.unitPrice;
            subtotal += total;
            return { ...i, total };
        });

        const tax = subtotal * 0.075; // 7.5% VAT standard
        const total = subtotal + tax;

        // Fetch Customer Name (Denormalization)
        const customer = await db.query.contacts.findFirst({ where: eq(contacts.id, input.customerId) });
        if (!customer) throw new Error("Customer not found");

        // Transaction
        return await db.transaction(async (tx) => {
            // 1. Create Sale Header
            const [sale] = await tx.insert(spSales).values({
                contactId: input.customerId,
                customerName: customer.name,
                saleDate: new Date(),
                dueDate: input.dueDate,
                subtotal: subtotal.toString(),
                tax: tax.toString(),
                total: total.toString(),
                status: "AWAITING_CONFIRMATION", // Default
                notes: input.notes,
                createdById: input.createdById
            }).returning();

            // 2. Create Sale Items
            for (const item of lineItems) {
                // Fetch Item Name
                const itemDef = await tx.query.items.findFirst({ where: eq(items.id, item.itemId) });

                await tx.insert(spSaleItems).values({
                    saleId: sale.id,
                    itemId: item.itemId,
                    itemName: itemDef?.name || "Unknown Item",
                    quantity: item.quantity.toString(),
                    unitPrice: item.unitPrice.toString(),
                    total: item.total.toString()
                });
            }

            return sale;
        });
    }

    static async confirmSale(saleId: string) {
        const db = await getDb();
        const { FinanceService } = await import("@/lib/finance");
        const { FinanceUtils } = await import("@/lib/finance-utils");

        return await db.transaction(async (tx) => {
            // 1. Get Sale Details
            const sale = await tx.query.spSales.findFirst({
                where: eq(spSales.id, saleId),
                with: { items: true }
            });
            if (!sale) throw new Error("Sale not found");
            if (sale.status === "CONFIRMED") return; // Already confirmed

            // 2. Update Status
            await tx.update(spSales)
                .set({ status: "CONFIRMED" })
                .where(eq(spSales.id, saleId));

            // 3. POST JOURNAL ENTRY (Revenue Recognition Accrual)
            // Debit Accounts Receivable (Customer owes)
            // Credit Sales Revenue
            const accounts = await FinanceUtils.getSystemAccounts();
            const totalAmount = Number(sale.total);

            await FinanceService.createTransaction({
                description: `Sale Invoice #${sale.id} (${sale.customerName})`,
                reference: sale.id,
                entries: [
                    {
                        accountId: accounts.ar.id,
                        amount: totalAmount, // Debit
                        description: `Used Credit for Sale #${sale.id}`
                    },
                    {
                        accountId: accounts.revenue.id,
                        amount: -totalAmount, // Credit
                        description: `Revenue for Sale #${sale.id}`
                    }
                ]
            }, tx);
        });
    }
}

export class QuoteService {
    static async createQuote(input: {
        customerId: string,
        items: { itemId: string, quantity: number, unitPrice: number }[],
        createdById: string,
        validUntil?: Date,
        notes?: string
    }) {
        const db = await getDb();

        let subtotal = 0;
        const lineItems = input.items.map(i => {
            const total = i.quantity * i.unitPrice;
            subtotal += total;
            return { ...i, total };
        });

        const tax = subtotal * 0.075;
        const total = subtotal + tax;

        const customer = await db.query.contacts.findFirst({ where: eq(contacts.id, input.customerId) });
        if (!customer) throw new Error("Customer not found");

        return await db.transaction(async (tx) => {
            const [quote] = await tx.insert(spQuotes).values({
                contactId: input.customerId,
                customerName: customer.name,
                quoteDate: new Date(),
                validUntil: input.validUntil,
                subtotal: subtotal.toString(),
                tax: tax.toString(),
                total: total.toString(),
                status: "DRAFT",
                notes: input.notes,
                createdById: input.createdById
            }).returning();

            for (const item of lineItems) {
                const itemDef = await tx.query.items.findFirst({ where: eq(items.id, item.itemId) });
                await tx.insert(spQuoteItems).values({
                    quoteId: quote.id,
                    itemId: item.itemId,
                    itemName: itemDef?.name || "Unknown Item",
                    quantity: item.quantity.toString(),
                    unitPrice: item.unitPrice.toString(),
                    total: item.total.toString()
                });
            }

            return quote;
        });
    }

    static async sendQuote(quoteId: string) {
        const db = await getDb();
        await db.update(spQuotes).set({ status: "SENT" }).where(eq(spQuotes.id, quoteId));
    }

    static async acceptQuote(quoteId: string, createdById: string) {
        const db = await getDb();

        // 1. Get Quote
        const quote = await db.query.spQuotes.findFirst({
            where: eq(spQuotes.id, quoteId),
            with: { items: true }
        });

        if (!quote) throw new Error("Quote not found");
        if (quote.status === "ACCEPTED") throw new Error("Quote already accepted");

        // 2. Create Sale from Quote
        const sale = await SalesService.createSale({
            customerId: quote.contactId, // Maps to contactId
            items: quote.items.map(i => ({
                itemId: i.itemId,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice)
            })),
            createdById: createdById,
            notes: `Converted from Quote #${quote.id}. ${quote.notes || ''}`
        });

        // 3. Mark Quote Accepted
        await db.update(spQuotes).set({ status: "ACCEPTED" }).where(eq(spQuotes.id, quoteId));

        return sale;
    }
}
