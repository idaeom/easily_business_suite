
"use server";

import { getDb } from "@/db";
import { dispatches, haulage, spSales, contacts, dispatchGrnEntries } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { logAuditAction } from "./audit";
import { receiveTransfer } from "./inventory";

// =========================================
// DISPATCH ACTIONS
// =========================================

export async function getDispatches() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    const db = await getDb();

    // Filter by User's Outlet (if set)
    const whereClause = user.outletId ? eq(dispatches.outletId, user.outletId) : undefined;

    // Fetch dispatches with related data
    const results = await db.query.dispatches.findMany({
        where: whereClause,
        with: {
            sale: {
                with: {
                    items: true
                }
            },
            contact: true,
            haulage: true,
            items: {
                with: {
                    item: true
                }
            } // GRN Entries (Delivery Log)
        },
        orderBy: [desc(dispatches.createdAt)]
    });

    return results;
}

export async function updateDispatchStatus(
    dispatchId: string,
    status: "PENDING" | "DISPATCHED" | "DELIVERED" | "CANCELLED"
) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    await db.update(dispatches)
        .set({ status })
        .where(eq(dispatches.id, dispatchId));

    await logAuditAction(user.id, "UPDATE_DISPATCH_STATUS", dispatchId, "DISPATCH", { status });

    revalidatePath("/dashboard/business/operations");
    return { success: true };
}

export async function assignHaulage(data: {
    dispatchId: string;
    haulageId: string; // Provider ID
    driverName: string;
    vehicleNumber: string;
    notes?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    // 1. Update Dispatch with Haulage Info & Set Status to DISPATCHED
    await db.update(dispatches)
        .set({
            haulageId: data.haulageId,
            driverName: data.driverName,
            vehicleNumber: data.vehicleNumber,
            notes: data.notes,
            status: "DISPATCHED",
            dispatchedById: user.id,
            dispatchDate: new Date()
        })
        .where(eq(dispatches.id, data.dispatchId));

    await logAuditAction(user.id, "ASSIGN_HAULAGE", data.dispatchId, "DISPATCH", {
        haulageId: data.haulageId,
        driver: data.driverName
    });

    revalidatePath("/dashboard/business/operations");
    return { success: true };
}

export async function logDispatchDelivery(data: {
    dispatchId: string;
    items: {
        itemId: string;
        quantityDispatched: number;
        quantityDelivered: number;
        quantityReturned: number;
        condition: string;
        comments?: string;
    }[];
    isFinal?: boolean;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    // Fetch dispatch to check for Transfer link
    const dispatch = await db.query.dispatches.findFirst({
        where: eq(dispatches.id, data.dispatchId)
    });

    await db.transaction(async (tx) => {
        // 1. Insert GRN Entries (Log)
        if (data.items.length > 0) {
            for (const item of data.items) {
                await tx.insert(dispatchGrnEntries).values({
                    dispatchId: data.dispatchId,
                    itemId: item.itemId,
                    quantityDispatched: item.quantityDispatched.toString(),
                    quantityDelivered: item.quantityDelivered.toString(),
                    quantityReturned: item.quantityReturned.toString(),
                    condition: item.condition,
                    comments: item.comments
                });
            }
        }

        // 2. Update Status if Final
        if (data.isFinal) {
            await tx.update(dispatches)
                .set({
                    status: "DELIVERED"
                })
                .where(eq(dispatches.id, data.dispatchId));
        } else if (data.items.length > 0) {
            // If logging items but not final -> Partial
            await tx.update(dispatches)
                .set({
                    status: "PARTIALLY_DELIVERED"
                })
                .where(eq(dispatches.id, data.dispatchId));
        }
    });

    // 3. Trigger Inventory Receipt for Transfers
    if (dispatch?.transferId) {
        const receivedItems = data.items
            .filter(i => i.quantityDelivered > 0)
            .map(i => ({
                itemId: i.itemId,
                quantity: i.quantityDelivered,
                condition: i.condition
            }));

        if (receivedItems.length > 0) {
            await receiveTransfer(dispatch.transferId, receivedItems);
        }
    }

    await logAuditAction(user.id, "LOG_DELIVERY", data.dispatchId, "DISPATCH", {
        count: data.items.length,
        final: data.isFinal
    });
    revalidatePath("/dashboard/business/operations");
    return { success: true };
}

// =========================================
// HAULAGE PROVIDER ACTIONS
// =========================================

export async function getHaulageProviders() {
    const db = await getDb();
    return await db.select().from(haulage);
}

export async function createHaulageProvider(data: {
    providerName: string;
    contactPerson: string;
    phone: string;
    vehicleType: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    const [provider] = await db.insert(haulage).values({
        providerName: data.providerName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        vehicleType: data.vehicleType,
        status: "ACTIVE"
    }).returning();

    revalidatePath("/dashboard/business/operations");
    return { success: true, provider };
}

export async function updateHaulageProvider(id: string, data: {
    providerName: string;
    contactPerson: string;
    phone: string;
    vehicleType: string;
    status: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    await db.update(haulage)
        .set({
            providerName: data.providerName,
            contactPerson: data.contactPerson,
            phone: data.phone,
            vehicleType: data.vehicleType,
            status: data.status
        })
        .where(eq(haulage.id, id));

    revalidatePath("/dashboard/business/operations");
    return { success: true };
}
