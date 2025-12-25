
import { InventoryService } from "../services/inventory-service";
import { getDb } from "../db";

async function runOperationsFlowTest() {
    console.log("🚀 Starting Operations (Logistics) Flow Integration Test");

    try {
        const db = await getDb();
        const { users, outlets, inventory } = await import("../db/schema");
        const { eq, and } = await import("drizzle-orm");

        // 1. Setup User (Admin)
        console.log("\n--- 1. Setting up Test Admin ---");
        let admin = await db.query.users.findFirst({ where: eq(users.email, "admin@test.com") });
        if (!admin) throw new Error("Admin user not found. Run previous tests first.");

        // 2. Setup Outlets (Source & Dest)
        console.log("\n--- 2. Setting up Outlets ---");
        let sourceOutlet = await db.query.outlets.findFirst({ where: eq(outlets.name, "Warehouse A") });
        if (!sourceOutlet) {
            [sourceOutlet] = await db.insert(outlets).values({ name: "Warehouse A", address: "Loc A" }).returning();
        }

        let destOutlet = await db.query.outlets.findFirst({ where: eq(outlets.name, "Shop B") });
        if (!destOutlet) {
            [destOutlet] = await db.insert(outlets).values({ name: "Shop B", address: "Loc B" }).returning();
        }
        console.log(`✅ Outlets: ${sourceOutlet.name} -> ${destOutlet.name}`);

        // 3. Create Item & Stock Source
        console.log("\n--- 3. Create Item & Initial Stock ---");
        const item = await InventoryService.createItem({
            name: "Transfer Widget " + Date.now(),
            price: 100,
            costPrice: 50,
            category: "Logistics",
            itemType: "RESALE",
            sku: "TRF-" + Date.now(),
            minStockLevel: 10
        });

        // Add 50 qty to Source
        await InventoryService.adjustStock({
            itemId: item.id,
            outletId: sourceOutlet.id,
            quantityChange: 50,
            reason: "CORRECTION",
            notes: "Initial Test Stock"
        }, admin.id);
        console.log(`✅ Added 50 stock to ${sourceOutlet.name}`);

        // 4. Initiate Transfer (Dispatch)
        console.log("\n--- 4. Initiate Dispatch Transfer (20 qty) ---");
        const transfer = await InventoryService.createTransfer({
            sourceOutletId: sourceOutlet.id,
            destinationOutletId: destOutlet.id,
            type: "DISPATCH",
            items: [{ itemId: item.id, quantity: 20 }],
            notes: "Test Transfer"
        }, admin.id);

        console.log(`✅ Transfer Created: ID ${transfer.id}, Status: ${transfer.status}`);

        // Verify Source Deduction
        const sourceStock = await db.query.inventory.findFirst({
            where: and(eq(inventory.itemId, item.id), eq(inventory.outletId, sourceOutlet.id))
        });
        console.log(`   Source Stock: ${sourceStock?.quantity} (Expected 30)`);

        if (Number(sourceStock?.quantity) !== 30) throw new Error("Source stock deduction failed");

        // 5. Receive Transfer
        console.log("\n--- 5. Receive Transfer at Destination ---");
        await InventoryService.receiveTransfer(transfer.id, admin.id);
        console.log("✅ Transfer Received");

        // 6. Verify Destination Stock
        console.log("\n--- 6. Verify Destination Stock ---");
        const destStock = await db.query.inventory.findFirst({
            where: and(eq(inventory.itemId, item.id), eq(inventory.outletId, destOutlet.id))
        });
        console.log(`   Destination Stock: ${destStock?.quantity} (Expected 20)`);

        if (Number(destStock?.quantity) !== 20) throw new Error("Destination stock addition failed");

        console.log("\n🎉 Operations Flow Test Completed!");
        process.exit(0);

    } catch (e: any) {
        console.error("\n❌ Operations Flow Test Failed:", e);
        process.exit(1);
    }
}

runOperationsFlowTest();
