
import { getPosProducts, getShiftMetrics, getTopSellingItems } from "@/actions/pos";
import { getDb } from "@/db";
import { items, users, outlets, contacts, shifts, posTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Starting POS Enhancements Test...");
    const db = await getDb();

    // 1. Pagination Test
    console.log("\n--- Testing Pagination ---");
    const p1 = await getPosProducts("", 1, 5);
    console.log(`Page 1: Returned ${p1.products.length} items. Total: ${p1.totalCount}. Pages: ${p1.totalPages}`);
    if (p1.currentPage !== 1) throw new Error("Current page incorrect");

    if (p1.totalPages > 1) {
        const p2 = await getPosProducts("", 2, 5);
        console.log(`Page 2: Returned ${p2.products.length} items.`);
        if (p2.currentPage !== 2) throw new Error("Current page incorrect for page 2");
    }

    // 2. Metrics Test
    console.log("\n--- Testing Shift Metrics ---");
    // Setup Context
    const user = await db.query.users.findFirst();
    const outlet = await db.query.outlets.findFirst();
    const item = await db.query.items.findFirst({ where: eq(items.itemType, "RESALE") });
    const customer = await db.query.contacts.findFirst();

    if (!user || !outlet || !item || !customer) {
        console.warn("Skipping metrics test due to missing seed data.");
        return;
    }

    // Open Shift (Manual DB Insert)
    console.log("Opening Test Shift (Direct DB)...");
    const shiftId = `SHIFT-TEST-METRICS-${Date.now()}`;
    await db.insert(shifts).values({
        id: shiftId,
        cashierId: user.id,
        outletId: outlet.id,
        startTime: new Date(),
        status: "OPEN",
        startCash: "0"
    });

    // Process Sale (Manual DB Insert to bypass Auth/Action complexity)
    console.log("Processing Sale (Direct DB)...");
    const txId = `TX-TEST-METRICS-${Date.now()}`;
    await db.insert(posTransactions).values({
        id: txId,
        shiftId: shiftId,
        contactId: customer.id,
        totalAmount: (Number(item.price) * 2).toString(),
        status: "COMPLETED",
        transactionDate: new Date(),
        itemsSnapshot: [{ itemId: item.id, qty: 2, price: Number(item.price), name: item.name }]
    });

    // Verify Metrics
    const metrics = await getShiftMetrics(shiftId);
    console.log("Metrics:", metrics);

    if (metrics.transactionCount !== 1) throw new Error("Metrics: Transaction count incorrect");
    if (metrics.itemsSold !== 2) throw new Error("Metrics: Items sold incorrect");
    if (metrics.totalRevenue !== Number(item.price) * 2) throw new Error("Metrics: Revenue incorrect");

    // 3. Top Selling Items Test
    console.log("\n--- Testing Top Selling Items ---");
    const topItems = await getTopSellingItems(5);
    console.log("Top Items:", topItems.map((i: any) => `${i.name} (Freq: ${i.frequency})`));

    // Cleanup
    console.log("\nCleaning up...");
    await db.delete(posTransactions).where(eq(posTransactions.id, txId));
    await db.delete(shifts).where(eq(shifts.id, shiftId));

    console.log("\n✅ POS Enhancements Verification Passed.");
    process.exit(0);
}

main().catch(console.error);
