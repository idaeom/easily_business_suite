
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

// Bypass Auth
process.env.IS_SCRIPT = "true";
import { createTransfer, adjustStock, getOutlets } from "../actions/inventory";

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
    console.log("🚀 Creating Visible Stock Transfer...");

    try {
        // 1. Get Main Outlet (First one is usually default for user)
        const outlets = await getOutlets();
        if (outlets.length === 0) throw new Error("No outlets found!");

        const mainOutlet = outlets[0];
        console.log(`Using Main Outlet: ${mainOutlet.name} (${mainOutlet.id})`);

        // 2. Ensure a Second Outlet Exists
        let destOutlet = outlets.find(o => o.id !== mainOutlet.id);
        if (!destOutlet) {
            console.log("Creating second outlet for transfer destination...");
            const [newOutlet] = await db.insert(schema.outlets).values({
                name: "Test Branch B",
                address: "456 Test St",
                phone: "555-0199"
            }).returning();
            destOutlet = newOutlet;
        }
        console.log(`Destination Outlet: ${destOutlet.name} (${destOutlet.id})`);

        // 3. Create/Find an Item
        const itemSku = `VISIBLE-TEST-${Date.now()}`;
        const [item] = await db.insert(schema.items).values({
            name: `Visible Test Item`,
            price: "100",
            costPrice: "50",
            category: "General",
            itemType: "RESALE",
            sku: itemSku
        }).returning();
        console.log(`Test Item: ${item.name} (${item.id})`);

        // 4. Stock Up Main Outlet
        console.log("Adding Stock to Main Outlet...");
        await safeAction(() => adjustStock({
            itemId: item.id,
            outletId: mainOutlet.id,
            quantityChange: 50,
            reason: "CORRECTION",
            notes: "Setup for Visible Transfer"
        }));

        // 5. Create Transfer
        console.log("Creating Transfer...");
        await safeAction(() => createTransfer({
            sourceOutletId: mainOutlet.id,
            destinationOutletId: destOutlet!.id,
            items: [{ itemId: item.id, quantity: 15 }],
            type: "DISPATCH",
            notes: "This is a visible test transfer"
        }));

        console.log("\n✅ Transfer Created! Checks:");
        console.log(`1. Go to Inventory > Stock Transfers.`);
        console.log(`2. You should see an OUTGOING transfer to ${destOutlet.name}.`);
        console.log(`3. It will be PENDING until received at the destination.`);

    } catch (e: any) {
        console.error("❌ Failed:", e.message);
    } finally {
        await pool.end();
    }
}

(global as any).jest = { mock: () => { } };
main();
