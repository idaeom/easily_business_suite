
import { getDb, livePool } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🔍 Inspecting AccountType Enum...");

    const client = await livePool.connect();
    try {
        // Check Enum Values from System Catalog
        const res = await client.query(`
            SELECT enum_range(NULL::"AccountType") as enum_values;
        `);
        console.log("📋 Enum Values in DB:", res.rows[0].enum_values);

        // Also check if type column is actually using the enum or text
        const colRes = await client.query(`
            SELECT data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'Account' AND column_name = 'type';
        `);
        console.log("📋 Column Type:", colRes.rows[0]);

    } catch (e: any) {
        console.error("❌ CRTICAL DB ERROR:", e.message);
    } finally {
        client.release();
    }
}

main().catch(console.error).then(() => process.exit(0));
