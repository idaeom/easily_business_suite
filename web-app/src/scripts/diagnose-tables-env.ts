
import { liveDb, testDb } from "../db";
import { sql } from "drizzle-orm";

async function checkTable(db: any, label: string) {
    console.log(`\n🔍 Checking ${label}...`);
    try {
        const { rows } = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'Dispatch' OR table_name = 'Haulage';
        `);
        console.log(`  Found Tables:`, rows.map((r: any) => r.table_name));

        if (rows.find((r: any) => r.table_name === 'Dispatch')) {
            const { rows: cols } = await db.execute(sql`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'Dispatch';
            `);
            console.log(`  'Dispatch' Columns:`, cols.map((c: any) => c.column_name));

            const hasQty = cols.find((c: any) => c.column_name === 'quantity');
            console.log(`  ✅ 'quantity' column: ${hasQty ? 'PRESENT' : 'MISSING'}`);
        } else {
            console.log(`  ❌ 'Item' table Missing`);
        }

    } catch (e: any) {
        console.log(`  ❌ Error connecting: ${e.message}`);
    }
}

async function main() {
    await checkTable(liveDb, "LIVE DB (Public Schema)");
    await checkTable(testDb, "TEST DB (Test Schema)");
    process.exit(0);
}

main();
