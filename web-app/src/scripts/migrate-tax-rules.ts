
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Migrating Tax Rules table...");

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS tax_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            is_default BOOLEAN DEFAULT false,
            rules JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
    `);

    console.log("Table created.");
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
