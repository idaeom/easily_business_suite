
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Checking columns for EmployeeProfile table...");

    const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'EmployeeProfile';
    `);

    console.log("Columns found:", result.rows.map((r: any) => r.column_name).sort());

    const hasPfaName = result.rows.some((r: any) => r.column_name === 'pfaName');
    console.log(`Has 'pfaName': ${hasPfaName}`);

    // Also check PayrollRun for expenseMeta
    const result2 = await db.execute(sql`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'PayrollRun';
    `);
    const hasExpenseMeta = result2.rows.some((r: any) => r.column_name === 'expenseMeta');
    console.log(`Has 'expenseMeta' in PayrollRun: ${hasExpenseMeta}`);

    process.exit(0);
}

main().catch(console.error);
