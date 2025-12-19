
"use server";

import { getDb } from "@/db";
import { contacts } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";

export async function getCustomers() {
    const db = await getDb();
    const results = await db.query.contacts.findMany({
        where: or(eq(contacts.type, "CUSTOMER"), eq(contacts.type, "BOTH")),
        orderBy: [desc(contacts.createdAt)]
    });
    return results;
}

export async function getCustomer(id: string) {
    const db = await getDb();
    const result = await db.query.contacts.findFirst({
        where: eq(contacts.id, id)
    });
    return result;
}
