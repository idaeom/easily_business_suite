import { getDb } from "@/db";
import {
    haulage, dispatches, dispatchGrnEntries, spSales,
    contacts, items // Contacts
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export class OperationsService {
    // ===========================
    // HAULAGE
    // ===========================
    static async createHaulage(data: { providerName: string, vehicleType: string, contactPerson?: string, phone?: string }) {
        const db = await getDb();
        const [h] = await db.insert(haulage).values(data).returning();
        return h;
    }

    static async getHaulageProviders() {
        const db = await getDb();
        return db.query.haulage.findMany();
    }

    // ===========================
    // DISPATCH
    // ===========================
    static async createDispatchFromSale(input: {
        saleId: string,
        haulageId?: string,
        driverName?: string,
        vehicleNumber?: string,
        dispatchedById: string,
        itemsToDispatch: { itemId: string, quantity: number }[]
    }) {
        const db = await getDb();

        // 1. Get Sale
        const sale = await db.query.spSales.findFirst({
            where: eq(spSales.id, input.saleId),
            with: { items: true } // Need to check qty if we were doing strict validation
        });
        if (!sale) throw new Error("Sale not found");
        if (sale.status !== "CONFIRMED" && sale.status !== "PAID") {
            // In a real app we might allow dispatching before payment for Credit Customers?
            // For now, allow CONFIRMED.
        }

        // 2. Get Customer Address
        const customer = await db.query.contacts.findFirst({ where: eq(contacts.id, sale.contactId) }); // contactId
        const address = customer?.address || "Unknown Address";

        return await db.transaction(async (tx) => {
            // 3. Create Dispatch Header
            const [dispatch] = await tx.insert(dispatches).values({
                salesId: input.saleId,
                contactId: sale.contactId, // Maps to contactId
                dispatchDate: new Date(),
                status: "PENDING",
                haulageId: input.haulageId,
                driverName: input.driverName,
                vehicleNumber: input.vehicleNumber,
                deliveryAddress: address,
                dispatchedById: input.dispatchedById
            }).returning();

            // 4. Create Dispatch Entries
            for (const item of input.itemsToDispatch) {
                await tx.insert(dispatchGrnEntries).values({
                    dispatchId: dispatch.id,
                    itemId: item.itemId,
                    quantityDispatched: item.quantity.toString(),
                    quantityDelivered: "0",
                    quantityReturned: "0",
                    condition: "GOOD"
                });
            }

            return dispatch;
        });
    }

    static async markDelivered(dispatchId: string) {
        const db = await getDb();
        await db.update(dispatches)
            .set({ status: "DELIVERED" })
            .where(eq(dispatches.id, dispatchId));
    }
}
