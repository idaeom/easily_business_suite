
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Setting up ItemOutletPrice table...");
    const db = await getDb();

    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "ItemOutletPrice" (
                "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
                "itemId" text NOT NULL REFERENCES "Item"("id") ON DELETE CASCADE,
                "outletId" text NOT NULL REFERENCES "Outlet"("id") ON DELETE CASCADE,
                "price" numeric(65, 30) NOT NULL,
                "createdAt" timestamp DEFAULT now() NOT NULL,
                "updatedAt" timestamp DEFAULT now() NOT NULL
            );
        `);

        await db.execute(sql`
            CREATE UNIQUE INDEX IF NOT EXISTS "item_outlet_price_unique" ON "ItemOutletPrice" ("itemId", "outletId");
        `);

        console.log("✅ ItemOutletPrice table created.");
    } catch (error) {
        console.error("Error setup:", error);
    }
    process.exit(0);
}

main();
