
import { liveDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🛠️  Manual Fix: Add Quantity Column to Item in Public Schema");

    try {
        await liveDb.execute(sql`
            ALTER TABLE "public"."Item" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 0 NOT NULL;
        `);
        console.log("✅ Added quantity column to Public Item table.");
    } catch (e: any) {
        console.log(`❌ Public Fix Failed: ${e.message}`);
    }

    try {
        // Try to fix Test schema directly too, just in case rebuild fails
        await liveDb.execute(sql`
            CREATE SCHEMA IF NOT EXISTS "test";
            CREATE TABLE IF NOT EXISTS "test"."Item" (LIKE "public"."Item" INCLUDING ALL);
            ALTER TABLE "test"."Item" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 0 NOT NULL;
        `);
        console.log("✅ Created/Updated Test Item table.");
    } catch (e: any) {
        console.log(`❌ Test Fix Failed: ${e.message}`);
    }

    process.exit(0);
}

main();
