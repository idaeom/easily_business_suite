import { getDb } from "@/db";
import {
    contacts, requestOrders, requestOrderItems, requestGrns, items, outlets
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export class InventoryService {
    // ===========================
    // VENDORS (Managed via Contacts)
    // ===========================
    static async createVendor(data: {
        name: string,
        email?: string,
        phone?: string,
        address?: string,
        bankName: string,
        accountNumber: string
    }) {
        const db = await getDb();
        const [vendor] = await db.insert(contacts).values([{
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            type: "VENDOR",
            bankName: data.bankName,
            accountNumber: data.accountNumber
        }]).returning();
        return vendor;
    }

    static async upgradeToVendor(contactId: string, details: { bankName: string, accountNumber: string }) {
        const db = await getDb();
        const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
        if (!contact) throw new Error("Contact not found");

        const newType = contact.type === "CUSTOMER" ? "BOTH" : "VENDOR"; // If already Vendor, stays Vendor (or updates details)

        await db.update(contacts).set({
            type: newType as any,
            bankName: details.bankName,
            accountNumber: details.accountNumber
        }).where(eq(contacts.id, contactId));
    }

    static async getVendors() {
        const db = await getDb();
        return db.query.contacts.findMany({
            where: eq(contacts.type, "VENDOR"),
            orderBy: [desc(contacts.createdAt)]
        });
    }

    // ===========================
    // STOCK MANAGEMENT
    // ===========================
    static async adjustStock(itemId: string, quantityDelta: number, reason: string) {
        // This would interact with a "StockLevel" table (OutletItemStock) which we might need to add if not implicit
        // For now, let's assume we just log it or update item metadata if strict tracking isn't enforced yet.
        // Actually, schema.ts for `items` has `minStockLevel`. We likely need a relation table `OutletStock` for multi-outlet.
        // But per spec, let's keep it simple or check if `items` has global quantity? 
        // Spec didn't explicitly ask for `OutletStock` table in Core, but implies it for Inventory.
        // Let's defer strict stock counts to a later refined step if needed, or maintain a ledger.
        console.log(`[Mock] Adjusting stock for ${itemId} by ${quantityDelta} (${reason})`);
    }
}

export class ProcurementService {
    // ===========================
    // REQUISITIONS (Request Orders)
    // ===========================
    static async createRequisition(input: {
        requesterId: string,
        outletId: string,
        description?: string,
        items: { itemId: string, quantity: number, estimatedUnitPrice: number }[]
    }) {
        const db = await getDb();

        let totalEst = 0;
        const lineItems = input.items.map(i => {
            totalEst += (i.quantity * i.estimatedUnitPrice);
            return i;
        });

        const { users } = await import("@/db/schema");
        const requester = await db.query.users.findFirst({ where: eq(users.id, input.requesterId) });
        if (!requester) throw new Error("Requester not found");

        return await db.transaction(async (tx) => {
            const [ro] = await tx.insert(requestOrders).values({
                requesterId: input.requesterId,
                requesterName: requester.name || "Unknown",
                outletId: input.outletId,
                requestDate: new Date(),
                description: input.description,
                status: "PENDING_APPROVAL",
                totalEstimatedAmount: totalEst.toString()
            }).returning();

            for (const item of lineItems) {
                await tx.insert(requestOrderItems).values({
                    requestOrderId: ro.id,
                    itemId: item.itemId,
                    quantity: item.quantity.toString(),
                    estimatedUnitPrice: item.estimatedUnitPrice.toString()
                });
            }
            return ro;
        });
    }

    static async approveRequisition(roId: string, approvedVendorId: string, approverId: string) {
        const db = await getDb();
        const { contacts, requestOrders, vendorLedgerEntries } = await import("@/db/schema");
        const { ExpenseService } = await import("@/lib/expenses");

        return await db.transaction(async (tx) => {
            // 1. Get RO details for amount
            const ro = await tx.query.requestOrders.findFirst({ where: eq(requestOrders.id, roId) });
            if (!ro) throw new Error("Requisition not found");

            // 2. Get Vendor Name
            const vendor = await tx.query.contacts.findFirst({ where: eq(contacts.id, approvedVendorId) });
            const vendorName = vendor?.name || "Unknown Vendor";

            // 3. Move state to APPROVED_FOR_PAYMENT
            await tx.update(requestOrders)
                .set({
                    status: "APPROVED_FOR_PAYMENT",
                    approvedVendorId: approvedVendorId
                })
                .where(eq(requestOrders.id, roId));

            // 4. Create PENDING Expense (Financial Integration - Cash/Bank later)
            await ExpenseService.createExpense({
                description: `Payment for Requisition #${ro.id} (${vendorName})`,
                amount: Number(ro.totalEstimatedAmount || 0),
                requesterId: approverId,
                category: "Procurement",
                payee: vendorName,
                beneficiaries: [{
                    name: vendorName,
                    bankName: vendor?.bankName || "Unknown Bank",
                    accountNumber: vendor?.accountNumber || "N/A",
                    bankCode: "000",
                    amount: Number(ro.totalEstimatedAmount || 0)
                }]
            } as any);

            // 5. Vendor Ledger Entry (Accounts Payable - Credit)
            // We owe the vendor this amount.
            // Balance logic: Credit increases liability. 
            // We need to fetch current balance? 
            // For now, let's assume we can sum on the fly or track it. 
            // Drizzle doesn't support easy "last balance" without query.
            // Let's simplified: just insert. Real ledger needs balance tracking.
            const amount = ro.totalEstimatedAmount || "0";

            await tx.insert(vendorLedgerEntries).values({
                contactId: approvedVendorId,
                requestOrderId: roId,
                entryDate: new Date(),
                description: `Purchase Requisition #${roId}`,
                credit: amount, // We owe
                debit: "0",
                balanceAfter: amount // Simplified: In reality, fetch prev balance + credit - debit
            });
        });
    }

    static async createGRN(input: {
        requestOrderId: string,
        receivedById: string,
        vendorInvoiceNumber?: string,
        itemsLogged: { itemId: string, quantityReceived: number, condition: "GOOD" | "DAMAGED" }[]
    }) {
        const db = await getDb();

        const ro = await db.query.requestOrders.findFirst({ where: eq(requestOrders.id, input.requestOrderId) });
        if (!ro) throw new Error("Requisition not found");

        return await db.transaction(async (tx) => {
            // 1. Create GRN
            const [grn] = await tx.insert(requestGrns).values({
                requestOrderId: input.requestOrderId,
                receivedDate: new Date(),
                receivedById: input.receivedById,
                vendorInvoiceNumber: input.vendorInvoiceNumber,
                itemsLogged: input.itemsLogged
            }).returning();

            // 2. Update RO status to GOODS_RECEIVED (if partial? handling partials is complex, assume full for now)
            await tx.update(requestOrders)
                .set({ status: "GOODS_RECEIVED" })
                .where(eq(requestOrders.id, input.requestOrderId));

            // 3. Update Stock (Simulated)
            for (const item of input.itemsLogged) {
                if (item.condition === "GOOD") {
                    await InventoryService.adjustStock(item.itemId, item.quantityReceived, `GRN #${grn.id}`);
                }
            }

            return grn;
        });
    }
}
