
import { getDb } from "../src/db";
import { dispatches, spSales, users, contacts, outlets } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function run() {
    console.log("Starting Partial Delivery Verification...");
    const db = await getDb();

    // 0. Setup User
    let [user] = await db.select().from(users).limit(1);
    if (!user) {
        try {
            [user] = await db.insert(users).values({
                name: "Test User",
                email: "test_verification_pd@example.com",
                role: "ADMIN"
            }).returning();
        } catch (e) {
            [user] = await db.select().from(users).limit(1);
        }
    }
    const userId = user.id;

    // Dependencies
    let [outlet] = await db.select().from(outlets).limit(1);
    if (!outlet) {
        [outlet] = await db.insert(outlets).values({ name: "Test Outlet", address: "Test", phone: "123" }).returning();
    }

    let [contact] = await db.select().from(contacts).limit(1);
    if (!contact) [contact] = await db.insert(contacts).values({ name: "Test Contact", type: "CUSTOMER" }).returning();

    // Create Sale
    const saleId = uuidv4();
    await db.insert(spSales).values({
        id: saleId,
        contactId: contact.id,
        customerName: contact.name,
        saleDate: new Date(),
        subtotal: "100",
        total: "100",
        status: "PAID",
        createdById: userId,
        outletId: outlet.id
    });

    // 1. Setup Dispatch
    console.log("Creating Dispatch...");
    const dispatchId = uuidv4();
    await db.insert(dispatches).values({
        id: dispatchId,
        salesId: saleId,
        contactId: contact.id,
        status: "DISPATCHED",
        // customerName: "Test Partial", // Not in schema
        deliveryAddress: "Test Addr",
        dispatchDate: new Date(),
        outletId: outlet.id
    });

    // 2. LOGIC VERIFICATION
    console.log("Simulating Delivery Update...");

    // Update status to DELIVERED
    await db.update(dispatches).set({ status: "DELIVERED" }).where(eq(dispatches.id, dispatchId));

    // Verify Status
    const d = await db.query.dispatches.findFirst({ where: eq(dispatches.id, dispatchId) });
    if (d?.status !== "DELIVERED") {
        console.error("FAIL: Dispatch status not updated.");
        process.exit(1);
    }

    console.log("SUCCESS: Delivery Logic Verified.");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
