
import { getDb, livePool } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🔍 Deep DB Verification");

    // 1. Check Env
    const connectionString = process.env.DATABASE_URL || "";
    const masked = connectionString.replace(/:[^:]+@/, ":***@");
    console.log(`📡 Connecting to: ${masked}`);

    // 2. Raw Query to inspect returned columns for a dummy select
    const client = await livePool.connect();
    try {
        console.log("📝 Running raw SELECT * FROM \"Account\" LIMIT 1...");
        const res = await client.query('SELECT * FROM "Account" LIMIT 1');

        if (res.fields) {
            console.log("📋 Column Headers Found:");
            res.fields.forEach(f => console.log(` - ${f.name}`));

            const hasBank = res.fields.some(f => f.name === 'bank_name');
            const hasAccount = res.fields.some(f => f.name === 'account_number');

            if (hasBank && hasAccount) {
                console.log("✅ SUCCESS: Columns exist in the active DB.");
            } else {
                console.error("❌ FAILURE: Columns MISSING in the active DB.");
            }
        } else {
            console.warn("⚠️ No fields returned (table might be empty, but fields should be there). Checking Schema Information...");
            const schemaRes = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'Account'
            `);
            console.log("📋 Information Schema Columns:", schemaRes.rows.map(r => r.column_name).join(", "));
        }

    } catch (e: any) {
        console.error("❌ CRTICAL DB ERROR:", e.message);
    } finally {
        client.release();
    }
}

main().catch(console.error).then(() => process.exit(0));
