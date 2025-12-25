import { getDb } from "@/db";
import { items, contacts, requestOrders, requestOrderItems, requestGrns, outlets, inventory, inventoryTransfers, itemOutletPrices, inventoryAdjustments, dispatches, dispatchGrnEntries } from "@/db/schema";
import { eq, desc, asc, like, or, sql, and, lte, inArray } from "drizzle-orm";
import { CreateItemDto, UpdateItemDto, CreateRequisitionDto, CreateGrnDto, CreateTransferDto } from "@/lib/dtos/inventory-dtos";

export class InventoryService {

    static async getOutlets() {
        const db = await getDb();
        let allOutlets = await db.select().from(outlets);

        if (allOutlets.length === 0) {
            const [defaultOutlet] = await db.insert(outlets).values([{
                name: "Main Warehouse",
                address: "HQ Address",
                phone: "000-000-0000"
            }]).returning();
            allOutlets = [defaultOutlet];
        }

        return allOutlets;
    }

    static async getItems(
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
            return allItems.map(item => {
                const specificStock = item.inventory.find((inv: any) => inv.outletId === outletId);
                const specificPrice = (item as any).outletPrices?.find((op: any) => op.outletId === outletId);

                return {
                    ...item,
                    price: specificPrice ? specificPrice.price : item.price,
                    quantity: specificStock ? specificStock.quantity : "0",
                    inventory: undefined
                };
            });
        }

        return allItems.map(item => {
            const globalStock = item.inventory.reduce((sum: number, inv: any) => sum + Number(inv.quantity), 0);
            return {
                ...item,
                quantity: globalStock.toString(),
            };
        });
    }

    static async createItem(data: CreateItemDto) {
        const db = await getDb();
        const [item] = await db.insert(items).values([{
            name: data.name,
            price: data.price.toString(),
            costPrice: data.costPrice.toString(),
            category: data.category,
            itemType: data.itemType,
            sku: data.sku,
            minStockLevel: data.minStockLevel || 0
        }]).returning();
        return item;
    }

    static async updateItem(id: string, data: UpdateItemDto) {
        const db = await getDb();

        await db.update(items).set({
            name: data.name,
            price: data.price.toString(),
            costPrice: data.costPrice.toString(),
            category: data.category,
            itemType: data.itemType,
            sku: data.sku,
            minStockLevel: data.minStockLevel
        }).where(eq(items.id, id));

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
    }

    static async getVendors() {
        const db = await getDb();
        return await db.query.contacts.findMany({
            where: or(eq(contacts.type, "VENDOR"), eq(contacts.type, "BOTH")),
            orderBy: [asc(contacts.name)]
        });
    }

    static async createVendor(data: {
        name: string;
        bankName: string;
        accountNumber: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
        address?: string;
        type?: "VENDOR" | "CUSTOMER" | "BOTH";
    }) {
        const db = await getDb();
        const [vendor] = await db.insert(contacts).values([{
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            type: data.type || "VENDOR",
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            contactPerson: data.contactPerson
        }]).returning();
        return vendor;
    }

    static async getRequisitions() {
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

    static async createRequisition(data: CreateRequisitionDto, userId: string, userName: string) {
        const db = await getDb();

        const totalEstimated = data.items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);

        const [req] = await db.insert(requestOrders).values([{
            requesterName: userName || "Unknown",
            requesterId: userId,
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
        return req;
    }

    static async updateRequisitionStatus(
        id: string,
        status: "APPROVED_FOR_PAYMENT" | "CANCELLED" | "DISBURSED",
        userId: string,
        vendorId?: string,
        updatedItems?: { itemId: string; quantity: number; price: number }[]
    ) {
        const db = await getDb();

        let totalAmountStr = undefined;

        if (updatedItems && updatedItems.length > 0) {
            const total = updatedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            totalAmountStr = total.toString();

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

        // EXPENSE CREATION TRIGGER
        if (status === "APPROVED_FOR_PAYMENT") {
            const { expenses: expensesSchema } = await import("@/db/schema");
            const reqOrder = await db.query.requestOrders.findFirst({
                where: eq(requestOrders.id, id),
                with: { approvedVendor: true }
            });

            if (reqOrder) {
                let vendorName = "Vendor";
                if (reqOrder.approvedVendor) {
                    vendorName = reqOrder.approvedVendor.name;
                } else if (reqOrder.approvedVendorId) {
                    const { contacts } = await import("@/db/schema");
                    const v = await db.query.contacts.findFirst({ where: eq(contacts.id, reqOrder.approvedVendorId) });
                    if (v) vendorName = v.name;
                }

                await db.insert(expensesSchema).values({
                    amount: reqOrder.totalEstimatedAmount || "0",
                    category: "Inventory",
                    description: `Requisition: ${reqOrder.description || "Approved Request"}`,
                    incurredAt: new Date(),
                    requesterId: userId, // The approver becomes the expense creator? Or logic allows it.
                    status: "APPROVED",
                    payee: vendorName,
                });
            }
        }
    }

    static async createGrn(data: CreateGrnDto, userId: string) {
        const db = await getDb();

        const reqOrder = await db.query.requestOrders.findFirst({
            where: eq(requestOrders.id, data.requestOrderId),
            with: {
                approvedVendor: true,
                items: true
            }
        });

        if (!reqOrder) throw new Error("Requisition not found");

        await db.insert(requestGrns).values([{
            requestOrderId: data.requestOrderId,
            receivedDate: new Date(),
            receivedById: userId,
            vendorInvoiceNumber: data.vendorInvoiceNumber,
            itemsLogged: data.items
        }]);

        let totalValue = 0;

        for (const receivedItem of data.items) {
            await db.update(items)
                .set({ quantity: sql`${items.quantity} + ${receivedItem.quantityReceived}` })
                .where(eq(items.id, receivedItem.itemId));

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

            const reqItem = reqOrder.items.find(i => i.itemId === receivedItem.itemId);
            const unitPrice = reqItem ? Number(reqItem.estimatedUnitPrice) : 0;
            totalValue += (unitPrice * receivedItem.quantityReceived);
        }

        const allGrns = await db.query.requestGrns.findMany({
            where: eq(requestGrns.requestOrderId, data.requestOrderId)
        });

        const receivedTotals = new Map<string, number>();
        allGrns.forEach(grn => {
            (grn.itemsLogged as any[]).forEach((item: any) => {
                const current = receivedTotals.get(item.itemId) || 0;
                receivedTotals.set(item.itemId, current + Number(item.quantityReceived));
            });
        });

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

        // GL Posting logic
        if (totalValue > 0) {
            const { FinanceService } = await import("./finance-service");
            const { accounts } = await import("@/db/schema");

            let inventoryAsset = await db.query.accounts.findFirst({ where: (a, { eq, and }) => and(eq(a.type, "ASSET"), like(a.name, "%Inventory%")) });
            if (!inventoryAsset) inventoryAsset = await db.query.accounts.findFirst({ where: eq(accounts.type, "ASSET") });

            let accountsPayable = await db.query.accounts.findFirst({ where: (a, { eq, and }) => and(eq(a.type, "LIABILITY"), like(a.name, "%Payable%")) });
            if (!accountsPayable) accountsPayable = await db.query.accounts.findFirst({ where: eq(accounts.type, "LIABILITY") });

            if (inventoryAsset && accountsPayable) {
                await FinanceService.createJournalEntry({
                    date: new Date(),
                    description: `GRN for Requisition #${reqOrder.id} - ${reqOrder.approvedVendor?.name || "Vendor"}`,
                    entries: [
                        {
                            accountId: inventoryAsset.id,
                            debit: totalValue,
                            credit: 0,
                            description: "Inventory Stock Increase"
                        },
                        {
                            accountId: accountsPayable.id,
                            debit: 0,
                            credit: totalValue,
                            description: "Accounts Payable (GRN)"
                        }
                    ]
                });
            }
        }

        return { totalValue, reqOrder };
    }

    static async adjustStock(data: {
        itemId: string;
        outletId: string;
        quantityChange: number;
        reason: "DAMAGE" | "THEFT" | "EXPIRED" | "CORRECTION" | "OTHER";
        notes?: string;
    }, userId: string) {
        const db = await getDb();

        const existingStock = await db.query.inventory.findFirst({
            where: and(eq(inventory.itemId, data.itemId), eq(inventory.outletId, data.outletId))
        });

        if (existingStock) {
            await db.update(inventory)
                .set({ quantity: sql`${inventory.quantity} + ${data.quantityChange}` })
                .where(eq(inventory.id, existingStock.id));
        } else {
            await db.insert(inventory).values({
                itemId: data.itemId,
                outletId: data.outletId,
                quantity: data.quantityChange.toString()
            });
        }

        await db.insert(inventoryAdjustments).values({
            itemId: data.itemId,
            outletId: data.outletId,
            quantityChange: data.quantityChange.toString(),
            reason: data.reason,
            notes: data.notes,
            userId: userId
        });
    }

    static async createTransfer(data: CreateTransferDto, userId: string) {
        const db = await getDb();

        for (const item of data.items) {
            const stock = await db.query.inventory.findFirst({
                where: and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, data.sourceOutletId))
            });
            if (!stock || Number(stock.quantity) < item.quantity) {
                throw new Error(`Insufficient stock for item ${item.itemId}`);
            }
        }

        const [transfer] = await db.insert(inventoryTransfers).values({
            sourceOutletId: data.sourceOutletId,
            destinationOutletId: data.destinationOutletId,
            items: data.items,
            type: data.type,
            status: data.type === "PICKUP" ? "COMPLETED" : "PENDING",
            notes: data.notes,
            createdById: userId,
            receivedById: data.type === "PICKUP" ? userId : undefined,
            receivedAt: data.type === "PICKUP" ? new Date() : undefined,
        }).returning();

        for (const item of data.items) {
            await db.update(inventory)
                .set({ quantity: sql`${inventory.quantity} - ${item.quantity}` })
                .where(and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, data.sourceOutletId)));
        }

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
                dispatchedById: userId
            }).returning();

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

        return transfer;
    }

    static async receiveTransfer(transferId: string, userId: string, itemsReceived?: { itemId: string; quantity: number; condition: string }[]) {
        const db = await getDb();

        const transfer = await db.query.inventoryTransfers.findFirst({
            where: eq(inventoryTransfers.id, transferId)
        });

        if (!transfer || transfer.status === "COMPLETED") throw new Error("Invalid transfer or already completed");

        const receiptItems = itemsReceived || (transfer.items as any[]).map(i => ({
            itemId: i.itemId,
            quantity: Number(i.quantity),
            condition: "GOOD"
        }));

        await db.insert(requestGrns).values({
            transferId: transferId,
            receivedDate: new Date(),
            receivedById: userId,
            itemsLogged: receiptItems.map(i => ({
                itemId: i.itemId,
                quantityReceived: i.quantity,
                condition: i.condition
            }))
        });

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
                receivedById: isComplete ? userId : undefined,
                receivedAt: isComplete ? new Date() : undefined
            })
            .where(eq(inventoryTransfers.id, transferId));
    }
}
