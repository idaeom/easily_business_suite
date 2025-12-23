
import { sql, eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";

// Set Environment for Script Mode (Bypass Auth)
process.env.IS_SCRIPT = "true";

// Import Actions AFTER setting env
import { createGrn, adjustStock, createTransfer, receiveTransfer } from "../actions/inventory";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL not set");

const pool = new Pool({ connectionString: dbUrl });
const db = drizzle(pool, { schema });

// Helper to ignore Next.js context errors
async function safeAction<T>(action: () => Promise<T>): Promise<T | { success: true }> {
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
    console.log("🚀 Starting Inventory Enhancements Verification...");

    // Setup Test Data
    const outletA = "outlet-a-id";
    const outletB = "outlet-b-id";
    const itemId = crypto.randomUUID();
    console.log(`Using Test Item ID: ${itemId}`);

    // Ensure Outlets Exist
    await db.insert(schema.outlets).values([
        { id: outletA, name: "Outlet A" },
        { id: outletB, name: "Outlet B" }
    ]).onConflictDoNothing();

    // Ensure Item Exists
    await db.insert(schema.items).values({
        id: itemId,
        name: "Test Item",
        price: "100",
        costPrice: "50",
        category: "General",
        itemType: "RESALE"
    }).onConflictDoNothing();

    // Ensure User
    await db.insert(schema.users).values({
        id: "test-user-id",
        email: "admin@test.com",
        role: "ADMIN"
    }).onConflictDoNothing();

    try {
        // ==========================================
        // 1. TEST STOCK ADJUSTMENT
        // ==========================================
        console.log("\n🧪 Testing Stock Adjustment...");
        await safeAction(() => adjustStock({
            itemId,
            outletId: outletA,
            quantityChange: 10,
            reason: "CORRECTION",
            notes: "Initial Stock"
        }));

        let inv = await db.query.inventory.findFirst({
            where: and(eq(schema.inventory.itemId, itemId), eq(schema.inventory.outletId, outletA))
        });
        console.log(`Outlet A Stock: ${inv?.quantity}`);
        if (Number(inv?.quantity) !== 10) throw new Error("Adjustment Failed");

        // ==========================================
        // 2. TEST STOCK TRANSFER
        // ==========================================
        console.log("\n🧪 Testing Stock Transfer (A -> B)...");
        await safeAction(() => createTransfer({
            sourceOutletId: outletA,
            destinationOutletId: outletB,
            items: [{ itemId, quantity: 5 }],
            type: "DISPATCH",
            notes: "Test Transfer"
        }));

        console.log("Fetching Transfer ID from DB...");
        const transfer = await db.query.inventoryTransfers.findFirst({
            where: and(
                eq(schema.inventoryTransfers.sourceOutletId, outletA),
                eq(schema.inventoryTransfers.destinationOutletId, outletB),
                eq(schema.inventoryTransfers.status, "PENDING")
            ),
            orderBy: [desc(schema.inventoryTransfers.createdAt)]
        });

        if (!transfer) throw new Error("Transfer creation failed (Not found in DB)");
        const transferId = transfer.id;

        // Verify Source Decrement
        inv = await db.query.inventory.findFirst({
            where: and(eq(schema.inventory.itemId, itemId), eq(schema.inventory.outletId, outletA))
        });
        console.log(`Outlet A Stock after Transfer: ${inv?.quantity}`);
        if (Number(inv?.quantity) !== 5) throw new Error("Source Stock not decremented");

        // Receive Transfer
        console.log(`Receiving Transfer ${transferId}...`);
        await safeAction(() => receiveTransfer(transferId));

        // Verify Dest Increment
        const invB = await db.query.inventory.findFirst({
            where: and(eq(schema.inventory.itemId, itemId), eq(schema.inventory.outletId, outletB))
        });
        console.log(`Outlet B Stock: ${invB?.quantity}`);
        if (Number(invB?.quantity) !== 5) throw new Error("Destination Stock not incremented");


        // ==========================================
        // 3. TEST PARTIAL GRN
        // ==========================================
        console.log("\n🧪 Testing Partial GRN...");
        // Create Vendor for Requisition
        const vendorId = "vendor-test-1";
        await db.insert(schema.contacts).values({
            id: vendorId,
            name: "Test Vendor",
            type: "VENDOR"
        }).onConflictDoNothing();

        // Create Requisition
        const [req] = await db.insert(schema.requestOrders).values({
            requesterName: "Test User",
            requesterId: "test-user-id",
            outletId: outletA,
            requestDate: new Date(),
            status: "APPROVED_FOR_PAYMENT",
            approvedVendorId: vendorId
        }).returning();

        await db.insert(schema.requestOrderItems).values({
            requestOrderId: req.id,
            itemId,
            quantity: "10",
            estimatedUnitPrice: "50"
        });

        // Receive 6/10
        console.log("Receiving 6/10 items...");
        await safeAction(() => createGrn({
            requestOrderId: req.id,
            items: [{ itemId, quantityReceived: 6, condition: "GOOD" }]
        }));

        const reqAfterPartial = await db.query.requestOrders.findFirst({
            where: eq(schema.requestOrders.id, req.id)
        });
        console.log(`Requisition Status: ${reqAfterPartial?.status}`);
        if (reqAfterPartial?.status !== "PARTIALLY_RECEIVED") throw new Error("Status mismatch: Expected PARTIALLY_RECEIVED");

        // Receive remaining 4/10
        console.log("Receiving remaining 4/10 items...");
        await safeAction(() => createGrn({
            requestOrderId: req.id,
            items: [{ itemId, quantityReceived: 4, condition: "GOOD" }]
        }));

        const reqAfterFull = await db.query.requestOrders.findFirst({
            where: eq(schema.requestOrders.id, req.id)
        });
        console.log(`Requisition Status: ${reqAfterFull?.status}`);
        if (reqAfterFull?.status !== "GOODS_RECEIVED") throw new Error("Status mismatch: Expected GOODS_RECEIVED");

        console.log("\n✅ Inventory Enhancements Verified Successfully!");

    } catch (e: any) {
        console.error("❌ Verification Failed:", e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Mock Jest global for script
(global as any).jest = { mock: () => { } };

main();
