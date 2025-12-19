
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Migrating Enums...");
    const db = await getDb();

    try {
        await db.execute(sql`ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'CONVERTED'`);
        console.log("Added CONVERTED");
    } catch (e) {
        console.log("Error adding CONVERTED (might exist):", e);
    }

    try {
        await db.execute(sql`ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'EXPIRED'`);
        console.log("Added EXPIRED");
    } catch (e) {
        console.log("Error adding EXPIRED (might exist):", e);
    }

    console.log("Migration complete.");
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
