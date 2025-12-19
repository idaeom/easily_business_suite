"use server";

import { getDb } from "@/db";
import { items, contacts, requestOrders, requestOrderItems, requestGrns, outlets } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, desc, asc, like, or, sql } from "drizzle-orm";

// =========================================
// OUTLETS
// =========================================

export async function getOutlets() {
    const db = await getDb();
    let allOutlets = await db.select().from(outlets);

    if (allOutlets.length === 0) {
        // Create default
        const [defaultOutlet] = await db.insert(outlets).values([{
            name: "Main Warehouse",
            address: "HQ Address",
            phone: "000-000-0000"
        }]).returning();
        allOutlets = [defaultOutlet];
    }

    return allOutlets;
}

// =========================================
// ITEMS (Master Data)
// =========================================

export async function getItems(type?: "RESALE" | "INTERNAL_USE" | "SERVICE" | "MANUFACTURED" | "RAW_MATERIAL") {
    const db = await getDb();
    if (type) {
        return await db.query.items.findMany({
            where: eq(items.itemType, type),
            orderBy: [asc(items.name)]
        });
    }
    return await db.query.items.findMany({
        orderBy: [asc(items.name)]
    });
}

export async function createItem(data: {
    name: string;
    price: number;
    costPrice: number;
    category: string;
    itemType: "RESALE" | "INTERNAL_USE" | "SERVICE" | "MANUFACTURED" | "RAW_MATERIAL";
    sku?: string;
    minStockLevel?: number;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    await db.insert(items).values([{
        name: data.name,
        price: data.price.toString(),
        costPrice: data.costPrice.toString(),
        category: data.category,
        itemType: data.itemType,
        sku: data.sku,
        minStockLevel: data.minStockLevel || 0
    }]);

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

// =========================================
// VENDORS (Contacts)
// =========================================

export async function getVendors() {
    const db = await getDb();
    // Assuming type VENDOR or BOTH
    // Drizzle ORM doesn't support 'IN' easily with enums unless using sql`` or or()
    // Let's filter in logic or use or()
    const vendors = await db.query.contacts.findMany({
        where: or(eq(contacts.type, "VENDOR"), eq(contacts.type, "BOTH")),
        orderBy: [asc(contacts.name)]
    });
    return vendors;
}

export async function createVendor(data: {
    name: string;
    bankName: string;
    accountNumber: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxId?: string;
    notes?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    const [vendor] = await db.insert(contacts).values([{
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        type: "VENDOR",
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        contactPerson: data.contactPerson
    }]).returning();

    revalidatePath("/dashboard/business/inventory");
    return { success: true, vendorId: vendor.id };
}

// =========================================
// REQUISITIONS
// =========================================

export async function getRequisitions() {
    const db = await getDb();
    return await db.query.requestOrders.findMany({
        orderBy: [desc(requestOrders.createdAt)],
        with: {
            requester: true,
            approvedVendor: true,
            items: {
                with: { item: true }
            }
        }
    });
}

export async function createRequisition(data: {
    outletId: string;
    items: { itemId: string; quantity: number; estimatedPrice: number }[];
    description?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Calculate total estimate
    const totalEstimated = data.items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);

    const [req] = await db.insert(requestOrders).values([{
        requesterName: user.name || "Unknown",
        requesterId: user.id,
        outletId: data.outletId,
        requestDate: new Date(),
        description: data.description,
        status: "PENDING_APPROVAL",
        totalEstimatedAmount: totalEstimated.toString()
    }]).returning();

    if (data.items.length > 0) {
        await db.insert(requestOrderItems).values(
            data.items.map(item => ({
                requestOrderId: req.id,
                itemId: item.itemId,
                quantity: item.quantity.toString(),
                estimatedUnitPrice: item.estimatedPrice.toString()
            }))
        );
    }

    revalidatePath("/dashboard/business/inventory");
    return { success: true, id: req.id };
}

export async function updateRequisitionStatus(id: string, status: "APPROVED_FOR_PAYMENT" | "CANCELLED" | "DISBURSED", vendorId?: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    await db.update(requestOrders)
        .set({
            status,
            approvedVendorId: vendorId
        })
        .where(eq(requestOrders.id, id));

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

// =========================================
// GOODS RECEIVED (GRN)
// =========================================

export async function createGrn(data: {
    requestOrderId: string;
    vendorInvoiceNumber?: string;
    items: { itemId: string; quantityReceived: number; condition: string }[];
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // 1. Create GRN Record
    await db.insert(requestGrns).values([{
        requestOrderId: data.requestOrderId,
        receivedDate: new Date(),
        receivedById: user.id,
        vendorInvoiceNumber: data.vendorInvoiceNumber,
        itemsLogged: data.items
    }]);

    // 2. Update Stock Levels
    for (const item of data.items) {
        // Increment stock
        await db.update(items)
            .set({
                quantity: sql`${items.quantity} + ${item.quantityReceived}`
            })
            .where(eq(items.id, item.itemId));
    }

    // 3. Mark Requisition as Received
    await db.update(requestOrders)
        .set({ status: "GOODS_RECEIVED" })
        .where(eq(requestOrders.id, data.requestOrderId));

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}
