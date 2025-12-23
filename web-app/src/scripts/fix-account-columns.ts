
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("🛠️ Attempting to ensure Account columns exist...");

    try {
        await db.execute(sql`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "bank_name" text;`);
        console.log("✅ bank_name check/add complete.");
    } catch (e: any) {
        console.error("⚠️ Error adding bank_name (might be harmless):", e.message);
    }

    try {
        await db.execute(sql`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "account_number" text;`);
        console.log("✅ account_number check/add complete.");
    } catch (e: any) {
        console.error("⚠️ Error adding account_number (might be harmless):", e.message);
    }

    console.log("🏁 Database Fix Script Finished.");
}

main().catch(console.error).then(() => process.exit(0));
