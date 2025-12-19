
import { getDb } from "../src/db";
import { dispatches, spSales, users, contacts, outlets } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function run() {
    console.log("Starting Delivery Options Verification...");
    const db = await getDb();

    // Setup User, Contact, Outlet
    const [user] = await db.select().from(users).limit(1);
    const [outlet] = await db.select().from(outlets).limit(1);
    const [contact] = await db.select().from(contacts).limit(1);

    if (!user || !outlet || !contact) {
        console.error("FAIL: Missing dependencies (User/Outlet/Contact). Run connection script first.");
        process.exit(1);
    }
    const userId = user.id;

    // TEST 1: DELIVERY (Should require Haulage)
    // We simulate the API/UI check by verifying data integrity if we forced it?
    // Actually, the check is UI side.
    // Here we verify DB accepts both.

    console.log("Test 1: Create DELIVERY Dispatch");
    const saleId1 = uuidv4();
    await db.insert(spSales).values({
        id: saleId1,
        contactId: contact.id, customerName: contact.name, saleDate: new Date(),
        subtotal: "100", total: "100", status: "PAID",
        deliveryMethod: "DELIVERY",
        createdById: userId, outletId: outlet.id
    });

    const dispatchId1 = uuidv4();
    await db.insert(dispatches).values({
        id: dispatchId1, salesId: saleId1, contactId: contact.id, outletId: outlet.id,
        status: "PENDING", deliveryMethod: "DELIVERY", deliveryAddress: "Addr", dispatchDate: new Date()
    });

    const d1 = await db.query.dispatches.findFirst({ where: eq(dispatches.id, dispatchId1) });
    if (d1?.deliveryMethod !== "DELIVERY") { console.error("FAIL: d1 method mismatch"); process.exit(1); }


    // TEST 2: PICKUP
    console.log("Test 2: Create PICKUP Dispatch");
    const saleId2 = uuidv4();
    await db.insert(spSales).values({
        id: saleId2,
        contactId: contact.id, customerName: contact.name, saleDate: new Date(),
        subtotal: "100", total: "100", status: "PAID",
        deliveryMethod: "PICKUP",
        createdById: userId, outletId: outlet.id
    });

    const dispatchId2 = uuidv4();
    await db.insert(dispatches).values({
        id: dispatchId2, salesId: saleId2, contactId: contact.id, outletId: outlet.id,
        status: "PENDING", deliveryMethod: "PICKUP", deliveryAddress: "Pickup at Branch", dispatchDate: new Date()
    });

    const d2 = await db.query.dispatches.findFirst({ where: eq(dispatches.id, dispatchId2) });
    if (d2?.deliveryMethod !== "PICKUP") { console.error("FAIL: d2 method mismatch"); process.exit(1); }

    console.log("SUCCESS: Delivery Options inserted correctly.");
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
