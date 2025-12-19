
import { sql } from "drizzle-orm";
import { getDb } from "../db";

async function main() {
    const db = await getDb(); // Defaults to Live or reads env/cookies
    console.log("Checking Tables in Database...");

    // Query pg_tables
    const result = await db.execute(sql`
        SELECT schemaname, tablename 
        FROM pg_catalog.pg_tables 
        WHERE schemaname != 'pg_catalog' 
        AND schemaname != 'information_schema';
    `);

    console.log("Found Tables:");
    result.rows.forEach(r => console.log(`${r.schemaname}.${r.tablename}`));
    process.exit(0);
}

main().catch(console.error);
