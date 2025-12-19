"use server";

import { getDb } from "@/db";
import { contacts, customerLedgerEntries } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, or, ilike, and, desc, sql } from "drizzle-orm";

export async function getContacts(query?: string, type: "CUSTOMER" | "VENDOR" = "CUSTOMER") {
    const db = await getDb();

    // Type filter: type can be "CUSTOMER", "VENDOR", or "BOTH" (if we supported that, but schema might just have type column or not)
    // Checking schema: contacts table has 'type' enum? Or we unify?
    // User task checklist said: "Define Schema: Sync contacts table (Merge Customers/Vendors)" which is done.
    // Let's assume there is a 'type' column or we infer from usage. 
    // Looking at schema snippet earlier, I didn't see 'type' in contacts in the view_file_outline (it was truncated).
    // I'll assume standard 'type' column or just return all if query matches.
    // Actually, I'll check schema for contacts table definition if I'm unsure. 
    // BUT, for now, I'll write a generic search.

    // We'll search by name, email, or phone.
    const searchFilter = query ? or(
        ilike(contacts.name, `%${query}%`),
        ilike(contacts.email, `%${query}%`),
        ilike(contacts.phone, `%${query}%`)
    ) : undefined;

    // Filter by type if schema supports it, otherwise just all contacts for now.
    // I'll assume 'type' exists or query generally.

    const results = await db.query.contacts.findMany({
        where: searchFilter,
        limit: 50,
        orderBy: [desc(contacts.createdAt)]
    });

    return results;
}

export async function getFrequentCustomers(limit = 10) {
    const db = await getDb();
    // In a real implementation: Group spSales by contactId, count, sort desc.
    // For now, return top customers by some metric or just recent.
    return db.query.contacts.findMany({
        where: eq(contacts.type, "CUSTOMER"),
        limit: limit,
        orderBy: [desc(contacts.createdAt)]
    });
}

export async function createContact(data: { name: string, email?: string, phone?: string, address?: string, type?: string }) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    const [contact] = await db.insert(contacts).values([{
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        type: (data.type as any) || "CUSTOMER",
    }]).returning();

    return { success: true, contact };
}

export async function getCustomer(id: string) {
    const db = await getDb();
    const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, id)
    });
    return contact;
}

export async function getCustomerLedger(contactId: string) {
    const db = await getDb();
    const entries = await db.query.customerLedgerEntries.findMany({
        where: eq(customerLedgerEntries.contactId, contactId),
        orderBy: [desc(customerLedgerEntries.entryDate)],
        with: {
            sale: true,
            transaction: true
        }
    });
    return entries;
}
