"use server";

import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CrmService } from "@/services/crm-service";
import { createContactSchema } from "@/lib/dtos/crm-dtos";

export async function getContacts(query?: string) {
    // Auth check optional for reading? usually yes for CRM.
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    return CrmService.getContacts(query);
}

export async function createContact(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const data = createContactSchema.parse(rawData);
    const contact = await CrmService.createContact(data);

    revalidatePath("/dashboard/business/crm");
    return { success: true, contact };
}

// ... other getters
export async function getCustomer(id: string) {
    const { getDb } = await import("@/db");
    const { contacts } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    return db.query.contacts.findFirst({ where: eq(contacts.id, id) });
}
