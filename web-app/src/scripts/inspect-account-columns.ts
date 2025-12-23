
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("🔍 Checking Account table columns...");

    const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Account';
    `);

    console.log("Columns found:", result.map((r: any) => r.column_name).join(", "));

    const hasBankName = result.some((r: any) => r.column_name === 'bank_name');
    const hasAccountNumber = result.some((r: any) => r.column_name === 'account_number');

    if (hasBankName && hasAccountNumber) {
        console.log("✅ Columns 'bank_name' and 'account_number' EXIST.");
    } else {
        console.error("❌ Columns MISSING.");
        console.log("Start attempting manual fix...");
        await db.execute(sql`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "bank_name" text;`);
        await db.execute(sql`ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "account_number" text;`);
        console.log("✅ Manual ALTER TABLE executed.");
    }
}

main().catch(console.error).then(() => process.exit(0));
