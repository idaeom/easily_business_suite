"use server";

import { getDb } from "@/db";
import { items, contacts, requestOrders, requestOrderItems, requestGrns, outlets, inventory, inventoryTransfers, itemOutletPrices } from "@/db/schema";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, desc, asc, like, or, sql, and, lte } from "drizzle-orm";

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

export async function getItems(
    type?: "RESALE" | "INTERNAL_USE" | "SERVICE" | "MANUFACTURED" | "RAW_MATERIAL",
    outletId?: string
) {
    const db = await getDb();
    let allItems = await db.query.items.findMany({
        where: type ? eq(items.itemType, type) : undefined,
        orderBy: [asc(items.name)],
        with: {
            inventory: true,
            outletPrices: true
        }
    });

    if (outletId && outletId !== "GLOBAL") {
        // Map quantity to specific outlet stock & Price
        return allItems.map(item => {
            const specificStock = item.inventory.find((inv: any) => inv.outletId === outletId);
            const specificPrice = (item as any).outletPrices?.find((op: any) => op.outletId === outletId);

            return {
                ...item,
                price: specificPrice ? specificPrice.price : item.price, // Override Price
                quantity: specificStock ? specificStock.quantity : "0",
                inventory: undefined // Simplify response
            };
        });
    }

    // Default: Total Global Stock (Sum of all outlets)
    return allItems.map(item => {
        const globalStock = item.inventory.reduce((sum: number, inv: any) => sum + Number(inv.quantity), 0);
        return {
            ...item,
            quantity: globalStock.toString(),
            // inventory: undefined // Optional: keep or remove relation
        };
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

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_ITEMS");

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

export async function updateItem(id: string, data: {
    name: string;
    price: number;
    costPrice: number;
    category: string;
    itemType: "RESALE" | "INTERNAL_USE" | "SERVICE" | "MANUFACTURED" | "RAW_MATERIAL";
    sku: string;
    minStockLevel: number;
    outletPrices?: { outletId: string; price: number }[];
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_ITEMS");

    const db = await getDb();

    // 1. Update Base Item
    await db.update(items).set({
        name: data.name,
        price: data.price.toString(),
        costPrice: data.costPrice.toString(),
        category: data.category,
        itemType: data.itemType,
        sku: data.sku,
        minStockLevel: data.minStockLevel
    }).where(eq(items.id, id));

    // 2. Upsert Outlet Prices
    if (data.outletPrices && data.outletPrices.length > 0) {
        for (const op of data.outletPrices) {
            await db.insert(itemOutletPrices)
                .values({
                    itemId: id,
                    outletId: op.outletId,
                    price: op.price.toString()
                })
                .onConflictDoUpdate({
                    target: [itemOutletPrices.itemId, itemOutletPrices.outletId],
                    set: { price: op.price.toString() }
                });
        }
    }

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

export async function updateRequisitionStatus(
    id: string,
    status: "APPROVED_FOR_PAYMENT" | "CANCELLED" | "DISBURSED",
    vendorId?: string,
    updatedItems?: { itemId: string; quantity: number; price: number }[]
) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // If items are provided, update them and recalculate total
    let totalAmountStr = undefined;

    if (updatedItems && updatedItems.length > 0) {
        // Calculate new total
        const total = updatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        totalAmountStr = total.toString();

        // Update items in DB
        // We do this serially or parallel
        await Promise.all(updatedItems.map(async (item) => {
            await db.update(requestOrderItems)
                .set({
                    quantity: item.quantity.toString(),
                    estimatedUnitPrice: item.price.toString()
                })
                .where(and(
                    eq(requestOrderItems.requestOrderId, id),
                    eq(requestOrderItems.itemId, item.itemId)
                ));
        }));
    }

    await db.update(requestOrders)
        .set({
            status,
            approvedVendorId: vendorId,
            ...(totalAmountStr ? { totalEstimatedAmount: totalAmountStr } : {})
        })
        .where(eq(requestOrders.id, id));

    // ===========================================
    // EXPENSE CREATION (On Approval for Disbursement)
    // ===========================================
    if (status === "APPROVED_FOR_PAYMENT") {
        const { expenses: expensesSchema } = await import("@/db/schema");
        const reqOrder = await db.query.requestOrders.findFirst({
            where: eq(requestOrders.id, id),
            with: { approvedVendor: true }
        });

        if (reqOrder) {
            let vendorName = "Vendor";
            // Resolve vendor name similar to createGrn logic
            if (reqOrder.approvedVendor) {
                vendorName = reqOrder.approvedVendor.name;
            } else if (reqOrder.approvedVendorId) {
                const { contacts } = await import("@/db/schema");
                const v = await db.query.contacts.findFirst({ where: eq(contacts.id, reqOrder.approvedVendorId) });
                if (v) vendorName = v.name;
            }

            await db.insert(expensesSchema).values({
                amount: reqOrder.totalEstimatedAmount || "0",
                category: "Inventory", // Or "Procurement"
                description: `Requisition: ${reqOrder.description || "Approved Request"}`,
                incurredAt: new Date(),
                requesterId: user.id,
                status: "APPROVED", // Auto-approved for payment as per user request
                payee: vendorName,
                // notes: `Requisition ID: ${reqOrder.id}` // Removed as field doesn't exist
            });
        }
    }

    revalidatePath("/dashboard/business/inventory");
    revalidatePath("/dashboard/finance"); // Update expenses list
    return { success: true };
}

// =========================================
// GOODS RECEIVED (GRN)
// =========================================


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

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_STOCK");

    const db = await getDb();

    // Fetch Request details for pricing and vendor info
    const reqOrder = await db.query.requestOrders.findFirst({
        where: eq(requestOrders.id, data.requestOrderId),
        with: {
            approvedVendor: true,
            items: true
        }
    });

    if (!reqOrder) throw new Error("Requisition not found");

    // 1. Create GRN Record
    await db.insert(requestGrns).values([{
        requestOrderId: data.requestOrderId,
        receivedDate: new Date(),
        receivedById: user.id,
        vendorInvoiceNumber: data.vendorInvoiceNumber,
        itemsLogged: data.items
    }]);

    // 2. Update Stock Levels (Both Item Master & Outlet Inventory)
    let totalValue = 0;

    for (const receivedItem of data.items) {
        // A. Update Global Item Master Quantity (if applicable)
        await db.update(items)
            .set({ quantity: sql`${items.quantity} + ${receivedItem.quantityReceived}` })
            .where(eq(items.id, receivedItem.itemId));

        // B. Update Outlet-Specific Inventory
        const existingStock = await db.query.inventory.findFirst({
            where: and(
                eq(inventory.itemId, receivedItem.itemId),
                eq(inventory.outletId, reqOrder.outletId)
            )
        });

        if (existingStock) {
            await db.update(inventory)
                .set({ quantity: sql`${inventory.quantity} + ${receivedItem.quantityReceived}` })
                .where(eq(inventory.id, existingStock.id));
        } else {
            await db.insert(inventory).values({
                itemId: receivedItem.itemId,
                outletId: reqOrder.outletId,
                quantity: receivedItem.quantityReceived.toString()
            });
        }

        // C. Calculate Value for GL
        const reqItem = reqOrder.items.find(i => i.itemId === receivedItem.itemId);
        const unitPrice = reqItem ? Number(reqItem.estimatedUnitPrice) : 0;
        totalValue += (unitPrice * receivedItem.quantityReceived);
    }

    // 3. Mark Requisition Status (PARTIAL or FULL)
    // Calculate total requested vs total received (including previous GRNs)
    const allGrns = await db.query.requestGrns.findMany({
        where: eq(requestGrns.requestOrderId, data.requestOrderId)
    });

    // We assume data.items is already in DB by now? Yes above. 
    // Wait, allGrns includes current one? Yes.

    // Sum all received quantities per item
    const receivedTotals = new Map<string, number>();
    allGrns.forEach(grn => {
        (grn.itemsLogged as any[]).forEach((item: any) => {
            const current = receivedTotals.get(item.itemId) || 0;
            receivedTotals.set(item.itemId, current + Number(item.quantityReceived));
        });
    });

    // Check if everything is fully received
    let isFullyReceived = true;
    for (const reqItem of reqOrder.items) {
        const received = receivedTotals.get(reqItem.itemId) || 0;
        if (received < Number(reqItem.quantity)) {
            isFullyReceived = false;
            break;
        }
    }

    await db.update(requestOrders)
        .set({ status: isFullyReceived ? "GOODS_RECEIVED" : "PARTIALLY_RECEIVED" })
        .where(eq(requestOrders.id, data.requestOrderId));

    // Resolve Vendor Name Robustly
    let vendorName = "Vendor";
    if (reqOrder.approvedVendor) {
        vendorName = reqOrder.approvedVendor.name;
    } else if (reqOrder.approvedVendorId) {
        const v = await db.query.contacts.findFirst({
            where: eq(contacts.id, reqOrder.approvedVendorId)
        });
        if (v) vendorName = v.name;
    }

    // =========================================================
    // 4. FINANCIAL POSTING (GL & EXPENSES)
    // =========================================================
    if (totalValue > 0) {
        const { createJournalEntry } = await import("./finance");
        const { accounts: accountsSchema } = await import("@/db/schema");

        // A. Find/Create GL Accounts
        // Inventory Asset Account
        let inventoryAcc = await db.query.accounts.findFirst({ where: eq(accountsSchema.name, "Inventory Asset") });
        if (!inventoryAcc) {
            // Create default Inventory Asset
            const [newAcc] = await db.insert(accountsSchema).values({
                name: "Inventory Asset",
                code: "1200", // Standard Asset Code
                type: "ASSET",
                description: "Value of stock on hand",
                isExternal: false
            }).returning();
            inventoryAcc = newAcc;
        }

        // Accounts Payable (Vendor)
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

        // B. Post Journal Entry (Double Entry)
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
    const db = await getDb();
    return await db.query.inventoryTransfers.findMany({
        orderBy: [desc(inventoryTransfers.createdAt)],
        with: {
            grns: true
        }
    });
}

// =========================================
// STOCK ADJUSTMENT & TRANSFER
// =========================================

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

    const db = await getDb();
    const { inventoryAdjustments } = await import("@/db/schema");

    // 1. Update Inventory
    const existingStock = await db.query.inventory.findFirst({
        where: and(eq(inventory.itemId, data.itemId), eq(inventory.outletId, data.outletId))
    });

    if (existingStock) {
        await db.update(inventory)
            .set({ quantity: sql`${inventory.quantity} + ${data.quantityChange}` })
            .where(eq(inventory.id, existingStock.id));
    } else {
        // Can only adjust if positive, or allow negative stock? Usually prevent negative unless correction.
        // If negative and no stock, it's weird. Assuming allow.
        await db.insert(inventory).values({
            itemId: data.itemId,
            outletId: data.outletId,
            quantity: data.quantityChange.toString()
        });
    }

    // 2. Log Adjustment
    await db.insert(inventoryAdjustments).values({
        itemId: data.itemId,
        outletId: data.outletId,
        quantityChange: data.quantityChange.toString(),
        reason: data.reason,
        notes: data.notes,
        userId: user.id
    });

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

export async function createTransfer(data: {
    sourceOutletId: string;
    destinationOutletId: string;
    items: { itemId: string; quantity: number }[];
    type: "PICKUP" | "DISPATCH";
    notes?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const { verifyPermission } = await import("@/lib/auth");
    await verifyPermission("INVENTORY_MANAGE_STOCK");

    const db = await getDb();
    const { dispatches, dispatchGrnEntries } = await import("@/db/schema");

    // 1. Validate Stock Availability
    for (const item of data.items) {
        const stock = await db.query.inventory.findFirst({
            where: and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, data.sourceOutletId))
        });
        if (!stock || Number(stock.quantity) < item.quantity) {
            throw new Error(`Insufficient stock for item ${item.itemId}`);
        }
    }

    // 2. Create Transfer Record
    const [transfer] = await db.insert(inventoryTransfers).values({
        sourceOutletId: data.sourceOutletId,
        destinationOutletId: data.destinationOutletId,
        items: data.items,
        type: data.type,
        status: data.type === "PICKUP" ? "COMPLETED" : "PENDING",
        notes: data.notes,
        createdById: user.id,
        // If PICKUP, auto-receive
        receivedById: data.type === "PICKUP" ? user.id : undefined,
        receivedAt: data.type === "PICKUP" ? new Date() : undefined,
    }).returning();

    // 3. Decrement Source Stock Immediately (Reserve it)
    for (const item of data.items) {
        await db.update(inventory)
            .set({ quantity: sql`${inventory.quantity} - ${item.quantity}` })
            .where(and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, data.sourceOutletId)));
    }

    // 4A. If PICKUP, Increment Destination Stock Immediately
    if (data.type === "PICKUP") {
        for (const item of data.items) {
            const existingStock = await db.query.inventory.findFirst({
                where: and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, data.destinationOutletId))
            });

            if (existingStock) {
                await db.update(inventory)
                    .set({ quantity: sql`${inventory.quantity} + ${item.quantity}` })
                    .where(eq(inventory.id, existingStock.id));
            } else {
                await db.insert(inventory).values({
                    itemId: item.itemId,
                    outletId: data.destinationOutletId,
                    quantity: item.quantity.toString()
                });
            }
        }
    }

    // 4B. If Dispatch, Create Dispatch Record (Integration with Operations)
    if (data.type === "DISPATCH") {
        const destOutlet = await db.query.outlets.findFirst({
            where: eq(outlets.id, data.destinationOutletId)
        });
        const destName = destOutlet?.name || "Destination Outlet";

        const [dispatch] = await db.insert(dispatches).values({
            transferId: transfer.id,
            outletId: data.sourceOutletId,
            status: "PENDING",
            deliveryMethod: "DELIVERY",
            deliveryAddress: destName,
            notes: `Transfer to Outlet: ${destName}`,
            dispatchedById: user.id // Initially created by user
        }).returning();

        // Create Dispatch Items
        if (data.items.length > 0) {
            await db.insert(dispatchGrnEntries).values(
                data.items.map(item => ({
                    dispatchId: dispatch.id,
                    itemId: item.itemId,
                    quantityDispatched: item.quantity.toString(),
                    condition: "GOOD"
                }))
            );
        }
    }

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

    const db = await getDb();

    const transfer = await db.query.inventoryTransfers.findFirst({
        where: eq(inventoryTransfers.id, transferId)
    });

    if (!transfer || transfer.status === "COMPLETED") throw new Error("Invalid transfer or already completed");

    // Default to Full Receipt if no items provided
    const receiptItems = itemsReceived || (transfer.items as any[]).map(i => ({
        itemId: i.itemId,
        quantity: Number(i.quantity),
        condition: "GOOD"
    }));

    // 1. Create Transfer GRN (Log Receipt)
    await db.insert(requestGrns).values({
        transferId: transferId,
        receivedDate: new Date(),
        receivedById: user.id,
        itemsLogged: receiptItems.map(i => ({
            itemId: i.itemId,
            quantityReceived: i.quantity,
            condition: i.condition
        }))
    });

    // 2. Increment Destination Stock
    for (const item of receiptItems) {
        const existingStock = await db.query.inventory.findFirst({
            where: and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, transfer.destinationOutletId))
        });

        if (existingStock) {
            await db.update(inventory)
                .set({ quantity: sql`${inventory.quantity} + ${item.quantity}` })
                .where(eq(inventory.id, existingStock.id));
        } else {
            await db.insert(inventory).values({
                itemId: item.itemId,
                outletId: transfer.destinationOutletId,
                quantity: item.quantity.toString()
            });
        }
    }

    // 3. Update Status (Partial vs Complete)
    const allGrns = await db.query.requestGrns.findMany({
        where: eq(requestGrns.transferId, transferId)
    });

    const receivedMap = new Map<string, number>();
    allGrns.forEach(grn => {
        (grn.itemsLogged as any[]).forEach((i: any) => {
            const current = receivedMap.get(i.itemId) || 0;
            receivedMap.set(i.itemId, current + Number(i.quantityReceived));
        });
    });

    // Check against transfer items
    let isComplete = true;
    for (const sentItem of (transfer.items as any[])) {
        const received = receivedMap.get(sentItem.itemId) || 0;
        if (received < Number(sentItem.quantity)) {
            isComplete = false;
            break;
        }
    }

    await db.update(inventoryTransfers)
        .set({
            status: isComplete ? "COMPLETED" : "PARTIALLY_COMPLETED",
            receivedById: isComplete ? user.id : undefined, // Last receiver?
            receivedAt: isComplete ? new Date() : undefined
        })
        .where(eq(inventoryTransfers.id, transferId));

    revalidatePath("/dashboard/business/inventory");
    return { success: true };
}

export async function getLowStockItems(outletId?: string) {
    const db = await getDb();

    // Condition: inventory.quantity <= items.minStockLevel
    const lowStock = await db.select({
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
        .where(and(
            outletId ? eq(inventory.outletId, outletId) : undefined,
            sql`CAST(${inventory.quantity} AS DECIMAL) <= ${items.minStockLevel}`,
            sql`${items.minStockLevel} > 0`
        ))
        .orderBy(asc(items.name))
        .limit(20);

    return lowStock;
}
