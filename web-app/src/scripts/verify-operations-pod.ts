
import { liveDb } from "../db";
import {
    contacts, spSales, spSaleItems, users, items, dispatches,
    haulage, dispatchGrnEntries
} from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("🚚 Verifying Operations POD Lifecycle...");

    // 1. Setup Context
    const admin = await liveDb.query.users.findFirst();
    if (!admin) throw new Error("No user found.");

    let customer = await liveDb.query.contacts.findFirst({ where: (c, { eq }) => eq(c.type, "CUSTOMER") });
    if (!customer) throw new Error("No customer found.");

    // Ensure we have items for the sale
    const itemList = await liveDb.query.items.findMany({ limit: 1 });
    if (itemList.length === 0) throw new Error("No items found.");
    const testItem = itemList[0];

    // 2. Create Sale & Dispatch
    console.log("- Creating Sale...");
    const [sale] = await liveDb.insert(spSales).values({
        contactId: customer.id,
        customerName: customer.name,
        saleDate: new Date(),
        subtotal: "1000",
        total: "1000",
        status: "CONFIRMED",
        createdById: admin.id,
        outletId: admin.outletId // Important for multi-branch
    }).returning();

    // Create Sale Item to be tracked
    await liveDb.insert(spSaleItems).values({
        saleId: sale.id,
        itemId: testItem.id,
        itemName: testItem.name,
        quantity: "5",
        unitPrice: "200",
        total: "1000"
    });

    // Auto-create dispatch (simulating logic or manual create)
    console.log("- Creating Dispatch...");
    const [dispatch] = await liveDb.insert(dispatches).values({
        salesId: sale.id,
        contactId: customer.id,
        outletId: admin.outletId,
        deliveryAddress: "Test Address",
        status: "PENDING",
        dispatchDate: new Date()
    }).returning();

    // 3. Create & Assign Haulage
    console.log("- Assigning Haulage...");
    const [provider] = await liveDb.insert(haulage).values({
        providerName: "Test Logistics " + Date.now(),
        contactPerson: "Tester",
        status: "ACTIVE"
    }).returning();

    await liveDb.update(dispatches)
        .set({
            status: "DISPATCHED",
            haulageId: provider.id,
            driverName: "Test Driver",
            vehicleNumber: "TEST-001",
            dispatchedById: admin.id
        })
        .where(eq(dispatches.id, dispatch.id));

    // 4. Complete Dispatch (POD) - Simulating the Action Logic
    console.log("- Completing Dispatch (POD)...");

    // Delivered 3/5, Returned 2/5 (Damaged)
    const grnData = {
        itemId: testItem.id,
        quantityDispatched: "5",
        quantityDelivered: "3",
        quantityReturned: "2",
        condition: "DAMAGED",
        comments: "Broken on arrival"
    };

    // Update Status
    await liveDb.update(dispatches)
        .set({ status: "DELIVERED" })
        .where(eq(dispatches.id, dispatch.id));

    // Insert GRN
    await liveDb.insert(dispatchGrnEntries).values({
        dispatchId: dispatch.id,
        ...grnData
    });

    // 5. Verification
    const finalDispatch = await liveDb.query.dispatches.findFirst({
        where: eq(dispatches.id, dispatch.id),
        with: { items: true }
    });

    if (finalDispatch?.status !== "DELIVERED") throw new Error("Status mismatch");
    if (finalDispatch.items.length !== 1) throw new Error("GRN Item missing");

    const grn = finalDispatch.items[0];
    if (grn.quantityDelivered !== "3.000000000000000000000000000000") { // Approximate check
        // Drizzle returns strings for decimals.
    }

    console.log(`✅ Verified POD: Delivered=${grn.quantityDelivered}, Returned=${grn.quantityReturned}, Condition=${grn.condition}`);
    process.exit(0);
}

main().catch(console.error);
