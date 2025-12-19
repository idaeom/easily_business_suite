
import { getDb } from "../src/db";
import { dispatches, spSales, users, contacts, outlets } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function run() {
    console.log("Starting Partial Status Enum Verification...");
    const db = await getDb();

    // Setup User, Contact, Outlet
    let [user] = await db.select().from(users).limit(1);
    if (!user) {
        try {
            [user] = await db.insert(users).values({
                name: "Test User",
                email: "test_verification_ps@example.com",
                role: "ADMIN"
            }).returning();
        } catch (e) {
            [user] = await db.select().from(users).limit(1);
        }
    }
    const userId = user.id;

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


    // Create Sale
    const saleId = uuidv4();
    await db.insert(spSales).values({
        id: saleId,
        contactId: contact.id, customerName: contact.name, saleDate: new Date(),
        subtotal: "100", total: "100", status: "PAID",
        deliveryMethod: "DELIVERY",
        createdById: userId, outletId: outlet.id
    });

    // Create Dispatch with PARTIALLY_DELIVERED status
    console.log("Testing PARTIALLY_DELIVERED insert...");
    const dispatchId = uuidv4();

    try {
        await db.insert(dispatches).values({
            id: dispatchId, salesId: saleId, contactId: contact.id, outletId: outlet.id,
            status: "PARTIALLY_DELIVERED", // Testing this Enum Value
            deliveryMethod: "DELIVERY", deliveryAddress: "Addr", dispatchDate: new Date()
        });
        console.log("Insert Successful.");
    } catch (e) {
        console.error("FAIL: Insert with PARTIALLY_DELIVERED failed. Enum issue?", e);
        process.exit(1);
    }

    const d = await db.query.dispatches.findFirst({ where: eq(dispatches.id, dispatchId) });
    if (d?.status !== "PARTIALLY_DELIVERED") {
        console.error("FAIL: Status mismatch reading back.");
        process.exit(1);
    }

    console.log("SUCCESS: PARTIALLY_DELIVERED is a valid status.");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
