
import { getDb } from "../src/db";
import { spQuotes, spSales, dispatches, items, contacts, outlets, users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function run() {
    const db = await getDb();
    console.log("Starting Sales-Ops Connection Verification...");

    // 0. Setup User
    let [user] = await db.select().from(users).limit(1);
    if (!user) {
        try {
            [user] = await db.insert(users).values({
                name: "Test User",
                email: "test_verification_so@example.com",
                role: "ADMIN"
            }).returning();
        } catch (e) {
            [user] = await db.select().from(users).limit(1);
        }
    }
    const userId = user.id;

    // 1. Setup Outlet & Contact
    let [outlet] = await db.select().from(outlets).limit(1);
    if (!outlet) {
        [outlet] = await db.insert(outlets).values({ name: "Test Outlet", address: "Test", phone: "123" }).returning();
    }

    let [contact] = await db.select().from(contacts).limit(1);
    if (!contact) {
        [contact] = await db.insert(contacts).values({
            name: "Test Customer", type: "CUSTOMER", email: "test@test.com", phone: "123"
        }).returning();
    }

    // 3. Create Quote (Minimal fields)
    const quoteId = uuidv4();
    await db.insert(spQuotes).values({
        id: quoteId,
        contactId: contact.id,
        customerName: contact.name,
        quoteDate: new Date(),
        validUntil: new Date(),
        subtotal: "200",
        total: "200",
        status: "ACCEPTED",
        deliveryMethod: "DELIVERY", // Added
        createdById: userId,
    });

    // 4. Simulate Conversion Logic
    // Schema spSales: id, contactId, customerName, saleDate, subtotal, total, status, createdById, outletId
    console.log("Simulating Conversion Logic...");
    const saleId = uuidv4();
    await db.insert(spSales).values({
        id: saleId,
        contactId: contact.id,
        customerName: contact.name,
        saleDate: new Date(),
        subtotal: "200",
        total: "200",
        status: "PAID",
        deliveryMethod: "DELIVERY", // Added
        createdById: userId,
        outletId: outlet.id
    });

    // Create Dispatch
    // Schema dispatches: id, salesId, contactId, outletId, status, deliveryAddress, dispatchDate
    console.log("Creating Dispatch...");
    const dispatchId = uuidv4();
    await db.insert(dispatches).values({
        id: dispatchId,
        salesId: saleId,
        contactId: contact.id,
        outletId: outlet.id,
        status: "PENDING",
        deliveryMethod: "DELIVERY", // Added
        deliveryAddress: contact.address || "Pickup",
        dispatchDate: new Date()
    });

    // 5. Verify Dispatch
    console.log("Verifying Dispatch...");
    const result = await db.query.dispatches.findFirst({
        where: eq(dispatches.id, dispatchId)
    });

    if (!result) {
        console.error("FAIL: Dispatch not found.");
        process.exit(1);
    }

    if (result.salesId !== saleId) {
        console.error(`FAIL: Sales ID mismatch.`);
        process.exit(1);
    }

    if (result.outletId !== outlet.id) {
        console.error(`FAIL: Outlet ID mismatch. Expected ${outlet.id}, got ${result.outletId}`);
        process.exit(1);
    }

    if (result.deliveryMethod !== "DELIVERY") {
        console.error(`FAIL: Delivery Method mismatch.`);
        process.exit(1);
    }

    console.log("SUCCESS: Dispatch created correctly.");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
