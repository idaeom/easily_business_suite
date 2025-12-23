
import { getDb } from "../db";
import { items, inventory, outlets } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

async function run() {
    const db = await getDb();
    console.log("--- Starting Stock Debit Test ---");

    // 1. Get First Outlet
    const allOutlets = await db.select().from(outlets).limit(1);
    if (allOutlets.length === 0) {
        console.error("No outlets found!");
        return;
    }
    const outlet = allOutlets[0];
    console.log(`Target Outlet: ${outlet.name} (${outlet.id})`);

    // 2. Get or Create Test Item
    let item = await db.query.items.findFirst({
        where: eq(items.name, "Stock Test Item")
    });

    if (!item) {
        console.log("Creating Test Item...");
        const [newItem] = await db.insert(items).values([{
            name: "Stock Test Item",
            price: "100",
            costPrice: "50",
            category: "Test",
            itemType: "RESALE",
            quantity: "0"
        }]).returning();
        item = newItem;
    }
    console.log(`Test Item: ${item.name} (${item.id})`);

    // 3. Reset Inventory for this item/outlet to 0 (or delete)
    await db.delete(inventory).where(and(eq(inventory.itemId, item.id), eq(inventory.outletId, outlet.id)));
    console.log("Inventory cleared for item.");

    // 4. Run the Logic from sales.ts
    const qty = 5;
    console.log(`Simulating Sale of Qty: ${qty}...`);

    console.log("Attempting Atomic Update...");
    // Force cast to numeric for subtraction?
    // Drizzle should handle `${inventory.quantity} - ${qty}` if quantity is decimal column.

    const result = await db.update(inventory)
        .set({ quantity: sql`${inventory.quantity} - ${qty}` })
        .where(and(eq(inventory.itemId, item.id), eq(inventory.outletId, outlet.id)))
        .returning();

    console.log("Update Result Length:", result.length);

    if (result.length === 0) {
        console.log("No record found. Inserting new negative record...");
        const [inserted] = await db.insert(inventory).values({
            itemId: item.id,
            outletId: outlet.id,
            quantity: (0 - qty).toString()
        }).returning();
        console.log("Inserted Quantity:", inserted.quantity);
    } else {
        console.log("Updated Quantity:", result[0].quantity);
    }

    // 5. Verify Final State
    const finalInv = await db.query.inventory.findFirst({
        where: and(eq(inventory.itemId, item.id), eq(inventory.outletId, outlet.id))
    });
    console.log("FINAL DB CHECK:", finalInv?.quantity);

    process.exit(0);
}

run().catch(console.error);
