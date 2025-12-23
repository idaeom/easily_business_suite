
import { sql, eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";

// Bypass Auth
process.env.IS_SCRIPT = "true";

import { createTransfer, receiveTransfer, adjustStock } from "../actions/inventory";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL not set");

const pool = new Pool({ connectionString: dbUrl });
const db = drizzle(pool, { schema });

// Helper to ignore Next.js context errors
async function safeAction<T>(action: () => Promise<T>): Promise<T | { success: true, transferId?: string }> {
    try {
        return await action();
    } catch (e: any) {
        if (e.message && (
            e.message.includes("static generation store") ||
            e.message.includes("revalidatePath") ||
            e.message.includes("Invariant")
        )) {
            console.log(`Ignoring Next.js revalidate error: ${e.message.substring(0, 50)}...`);
            return { success: true } as any;
        }
        throw e;
    }
}

async function main() {
    console.log("🚀 Starting Focused Stock Transfer Verification...");

    const uniqueId = crypto.randomUUID().split('-')[0];
    const itemSku = `TRANSFER-TEST-${uniqueId}`;
    let itemId: string;
    const outletAId = `outlet-src-${uniqueId}`;
    const outletBId = `outlet-dest-${uniqueId}`;

    try {
        // 1. Setup Outlets
        console.log("1. Setting up Test Outlets...");
        await db.insert(schema.outlets).values([
            { id: outletAId, name: `Source Outlet ${uniqueId}` },
            { id: outletBId, name: `Dest Outlet ${uniqueId}` }
        ]);

        // 2. Setup Item
        console.log("2. Creating Test Item...");
        const [item] = await db.insert(schema.items).values({
            name: `Transfer Item ${uniqueId}`,
            price: "500",
            costPrice: "300",
            category: "General",
            itemType: "RESALE",
            sku: itemSku
        }).returning();
        itemId = item.id;

        // 3. Add Initial Stock to Source (Using Adjust Action)
        console.log("3. Adding Initial Stock to Source (100 units)...");
        await safeAction(() => adjustStock({
            itemId: itemId,
            outletId: outletAId,
            quantityChange: 100,
            reason: "CORRECTION",
            notes: "Initial Transfer Test"
        }));

        // Verify Source Stock
        let srcStock = await db.query.inventory.findFirst({
            where: and(eq(schema.inventory.itemId, itemId), eq(schema.inventory.outletId, outletAId))
        });
        console.log(`   Source Stock: ${srcStock?.quantity}`);
        if (Number(srcStock?.quantity) !== 100) throw new Error("Initial stock setup failed");

        // 4. Initiate Transfer (Dispatch)
        console.log("4. Initiating Transfer of 20 units (Type: DISPATCH)...");
        const actionRes: any = await safeAction(() => createTransfer({
            sourceOutletId: outletAId,
            destinationOutletId: outletBId,
            items: [{ itemId, quantity: 20 }],
            type: "DISPATCH",
            notes: "Testing Dispatch Integration"
        }));

        // Fetch Transfer ID (Robustly)
        const transfer = await db.query.inventoryTransfers.findFirst({
            where: and(
                eq(schema.inventoryTransfers.sourceOutletId, outletAId),
                eq(schema.inventoryTransfers.destinationOutletId, outletBId),
                eq(schema.inventoryTransfers.status, "PENDING")
            ),
            orderBy: [desc(schema.inventoryTransfers.createdAt)]
        });

        if (!transfer) throw new Error("Transfer not found in DB");
        const transferId = transfer.id;
        console.log(`   Transfer Created: ${transferId}`);

        // 5. Verify Source Stock Decrement (Reserve)
        srcStock = await db.query.inventory.findFirst({
            where: and(eq(schema.inventory.itemId, itemId), eq(schema.inventory.outletId, outletAId))
        });
        console.log(`   Source Stock After Transfer: ${srcStock?.quantity} (Expected: 80)`);
        if (Number(srcStock?.quantity) !== 80) throw new Error("Source stock not reserved/decremented");

        // 6. Verify Dispatch Record Creation
        console.log("6. Verifying Dispatch Record Integration...");
        const dispatch = await db.query.dispatches.findFirst({
            where: eq(schema.dispatches.transferId, transferId)
        });

        if (!dispatch) throw new Error("Linked Dispatch record was NOT created!");
        console.log(`   Dispatch Record Found: ${dispatch.id} (Status: ${dispatch.status})`);

        // 7. Receive Transfer
        console.log("7. Receiving Transfer at Destination...");
        await safeAction(() => receiveTransfer(transferId));

        // 8. Verify Destination Stock Increment
        const destStock = await db.query.inventory.findFirst({
            where: and(eq(schema.inventory.itemId, itemId), eq(schema.inventory.outletId, outletBId))
        });
        console.log(`   Destination Stock: ${destStock?.quantity} (Expected: 20)`);
        if (Number(destStock?.quantity) !== 20) throw new Error("Destination stock not incremented");

        // 9. Verify Transfer Status
        const customTransfer = await db.query.inventoryTransfers.findFirst({ where: eq(schema.inventoryTransfers.id, transferId) });
        console.log(`   Transfer Final Status: ${customTransfer?.status} (Expected: COMPLETED)`);
        if (customTransfer?.status !== "COMPLETED") throw new Error("Transfer status not updated to COMPLETED");

        console.log("\n✅ Stock Transfer & Dispatch Integration Verified Successfully!");

    } catch (e: any) {
        console.error("\n❌ Verification Failed:", e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Global script bypass
(global as any).jest = { mock: () => { } };

main();
