
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Starting manual schema fix...");
    const db = await getDb();

    try {
        // 1. Add transferId column to RequestGrn
        console.log("Adding transferId to RequestGrn...");
        await db.execute(sql`
            ALTER TABLE "RequestGrn" 
            ADD COLUMN IF NOT EXISTS "transferId" text REFERENCES "InventoryTransfer"("id");
        `);
        console.log("✅ Added transferId.");

        // 2. Make requestOrderId nullable
        console.log("Making requestOrderId nullable...");
        await db.execute(sql`
            ALTER TABLE "RequestGrn" 
            ALTER COLUMN "requestOrderId" DROP NOT NULL;
        `);
        console.log("✅ Made requestOrderId nullable.");

        console.log("All fixes applied successfully.");
    } catch (error) {
        console.error("Error applying fixes:", error);
    }
    process.exit(0);
}

main();
