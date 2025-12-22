
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Checking Shift table columns...");

    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Shift';
        `);
        console.table(result.rows);
    } catch (e) {
        console.error("Error inspecting columns:", e);
    }
}

main();
