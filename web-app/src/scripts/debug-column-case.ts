
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Testing Column Case Sensitivity...");
    const db = await getDb();

    // Test 1: quoted mixed case (what Drizzle is doing)
    try {
        await db.execute(sql`SELECT "pfaName" FROM "EmployeeProfile" LIMIT 1`);
        console.log('SELECT "pfaName" WORKS');
    } catch (e: any) {
        console.log('SELECT "pfaName" FAILS:', e.message);
    }

    // Test 2: quoted lowercase
    try {
        await db.execute(sql`SELECT "pfaname" FROM "EmployeeProfile" LIMIT 1`);
        console.log('SELECT "pfaname" WORKS');
    } catch (e: any) {
        console.log('SELECT "pfaname" FAILS:', e.message);
    }

    // Test 3: unquoted (postgres lowercases it)
    try {
        await db.execute(sql`SELECT pfaName FROM "EmployeeProfile" LIMIT 1`);
        console.log('SELECT pfaName (unquoted) WORKS');
    } catch (e: any) {
        console.log('SELECT pfaName (unquoted) FAILS:', e.message);
    }

    // Dump all columns again to be absolutely sure
    const res = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'EmployeeProfile'
    `);
    console.log("Actual Columns:", res.rows.map((r: any) => r.column_name));

    process.exit(0);
}
main();
