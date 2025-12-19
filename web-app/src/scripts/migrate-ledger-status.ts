
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Migrating CustomerLedgerEntry...");
    const db = await getDb();

    try {
        await db.execute(sql`ALTER TABLE "CustomerLedgerEntry" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'CONFIRMED';`);
        await db.execute(sql`ALTER TABLE "CustomerLedgerEntry" ADD COLUMN IF NOT EXISTS "reconciledById" text REFERENCES "User"("id");`);
        await db.execute(sql`ALTER TABLE "CustomerLedgerEntry" ADD COLUMN IF NOT EXISTS "reconciledAt" timestamp;`);
        console.log("Migration successful");
    } catch (e) {
        console.error("Migration failed:", e);
    }
    process.exit(0);
}

main();
