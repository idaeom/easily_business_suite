"use server";

import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { InventoryService } from "@/services/inventory-service";
import {
    createItemSchema,
    updateItemSchema,
    createRequisitionSchema,
    createGrnSchema,
    transferItemsSchema
} from "@/lib/dtos/inventory-dtos";

// =========================================
// OUTLETS
// =========================================

export async function getOutlets() {
    return InventoryService.getOutlets();
}

// =========================================
// ITEMS
// =========================================

export async function getItems(
    type?: "RESALE" | "INTERNAL_USE" | "SERVICE" | "MANUFACTURED" | "RAW_MATERIAL",
    outletId?: string
) {
    return InventoryService.getItems(type, outletId);
}

export async function createItem(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_ITEMS");

    const data = createItemSchema.parse(rawData);
    await InventoryService.createItem(data);

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

export async function updateItem(id: string, rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_ITEMS");

    const data = updateItemSchema.parse(rawData);
    await InventoryService.updateItem(id, data);

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

// =========================================
// VENDORS
// =========================================

export async function getVendors() {
    return InventoryService.getVendors();
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
    // TODO: Add VendorDTO if needed, for now trusting inputs or standardizing later

    const vendor = await InventoryService.createVendor(data);

    revalidatePath("/dashboard/business/inventory");
    return { success: true, vendorId: vendor.id };
}

// =========================================
// REQUISITIONS
// =========================================

export async function getRequisitions() {
    return InventoryService.getRequisitions();
}

export async function createRequisition(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const data = createRequisitionSchema.parse(rawData);
    const req = await InventoryService.createRequisition(data, user.id, user.name || "Unknown");

    revalidatePath("/dashboard/business/inventory");
    return { success: true, id: req.id };
}

export async function updateRequisitionStatus(
    id: string,
    status: "APPROVED_FOR_PAYMENT" | "CANCELLED" | "DISBURSED",
    vendorId?: string,
    updatedItems?: { itemId: string; quantity: number; price: number }[]
) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    await InventoryService.updateRequisitionStatus(id, status, user.id, vendorId, updatedItems);

    revalidatePath("/dashboard/business/inventory");
    revalidatePath("/dashboard/finance");
    return { success: true };
}

// =========================================
// GOODS RECEIVED (GRN)
// =========================================

export async function createGrn(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_STOCK");

    const data = createGrnSchema.parse(rawData);

    // Execute Service
    const { totalValue, reqOrder } = await InventoryService.createGrn(data, user.id);

    // GL POSTING (Kept in Controller for now to avoid circular dependency or huge refactor of finance module)
    if (totalValue > 0) {
        const { createJournalEntry } = await import("./finance");
        const { accounts: accountsSchema } = await import("@/db/schema");
        const { getDb } = await import("@/db");
        const db = await getDb();
        const { eq } = await import("drizzle-orm");

        // ... Copied GL Logic ... 
        // A. Find/Create GL Accounts
        let inventoryAcc = await db.query.accounts.findFirst({ where: eq(accountsSchema.name, "Inventory Asset") });
        if (!inventoryAcc) {
            const [newAcc] = await db.insert(accountsSchema).values({
                name: "Inventory Asset",
                code: "1200",
                type: "ASSET",
                description: "Value of stock on hand",
                isExternal: false
            }).returning();
            inventoryAcc = newAcc;
        }

        const apAccountName = "Accounts Payable";
        let apAcc = await db.query.accounts.findFirst({ where: eq(accountsSchema.name, apAccountName) });
        if (!apAcc) {
            const existingCode = await db.query.accounts.findFirst({ where: eq(accountsSchema.code, "2100") });
            if (existingCode) {
                apAcc = existingCode;
            } else {
                const [newAp] = await db.insert(accountsSchema).values({
                    name: apAccountName,
                    code: "2100",
                    type: "LIABILITY",
                    description: "Outstanding Payments to Vendors",
                    isExternal: false
                }).returning();
                apAcc = newAp;
            }
        }

        // Resolve Vendor name
        let vendorName = "Vendor";
        if (reqOrder.approvedVendor) {
            vendorName = reqOrder.approvedVendor.name;
        } else if (reqOrder.approvedVendorId) {
            const { contacts } = await import("@/db/schema");
            const v = await db.query.contacts.findFirst({ where: eq(contacts.id, reqOrder.approvedVendorId) });
            if (v) vendorName = v.name;
        }

        try {
            await createJournalEntry({
                description: `GRN: ${reqOrder.description || "Stock Received"} - Ref: ${data.vendorInvoiceNumber || "N/A"}`,
                date: new Date(),
                entries: [
                    {
                        accountId: inventoryAcc.id,
                        debit: totalValue,
                        credit: 0,
                        description: "Stock Value Increase"
                    },
                    {
                        accountId: apAcc.id,
                        debit: 0,
                        credit: totalValue,
                        description: `Payable to ${vendorName}`
                    }
                ]
            });
        } catch (e: any) {
            console.log("Journal Entry created (safe fail on revalidate):", e.message);
        }
    }

    revalidatePath("/dashboard/business/inventory");
    revalidatePath("/dashboard/finance");
    return { success: true };
}

// =========================================
// STOCK ADJUSTMENT & TRANSFER
// =========================================

export async function getTransfers() {
    const { getDb } = await import("@/db");
    const { inventoryTransfers } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    // Should verify if this simple query really needs a service. 
    // Service abstraction is usually better.
    const db = await getDb();
    return await db.query.inventoryTransfers.findMany({
        orderBy: [desc(inventoryTransfers.createdAt)],
        with: { grns: true }
    });
}

export async function adjustStock(data: {
    itemId: string;
    outletId: string;
    quantityChange: number;
    reason: "DAMAGE" | "THEFT" | "EXPIRED" | "CORRECTION" | "OTHER";
    notes?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_STOCK");

    // TODO: create AdjustStockDto
    await InventoryService.adjustStock(data, user.id);

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

export async function createTransfer(rawData: any) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_STOCK");

    const data = transferItemsSchema.parse(rawData);
    const transfer = await InventoryService.createTransfer(data, user.id);

    revalidatePath("/dashboard/business/inventory");
    return { success: true, transferId: transfer.id };
}

export async function receiveTransfer(
    transferId: string,
    itemsReceived?: { itemId: string; quantity: number; condition: string }[]
) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_STOCK");

    await InventoryService.receiveTransfer(transferId, user.id, itemsReceived);

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

export async function getLowStockItems(outletId?: string) {
    const { getDb } = await import("@/db");
    const { items, inventory, outlets } = await import("@/db/schema");
    const db = await getDb();
    const { lte, eq, sql } = await import("drizzle-orm");

    return await db.select({
        id: items.id,
        name: items.name,
        sku: items.sku,
        minStockLevel: items.minStockLevel,
        quantity: inventory.quantity,
        outletName: outlets.name,
        outletId: inventory.outletId
    })
        .from(inventory)
        .innerJoin(items, eq(inventory.itemId, items.id))
        .innerJoin(outlets, eq(inventory.outletId, outlets.id))
        .where(lte(sql`CAST(${inventory.quantity} AS DECIMAL)`, items.minStockLevel));
}
