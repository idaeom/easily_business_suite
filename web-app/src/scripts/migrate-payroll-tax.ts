
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Migrating Payroll Tax & Deduction Fields...");
    const db = await getDb();

    // EmployeeProfile Updates
    await db.execute(sql`
        ALTER TABLE "EmployeeProfile" 
        ADD COLUMN IF NOT EXISTS "isPensionActive" boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS "pensionVoluntary" decimal(65,30) DEFAULT '0',
        ADD COLUMN IF NOT EXISTS "isNhfActive" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "isNhisActive" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "lifeAssurance" decimal(65,30) DEFAULT '0';
    `);

    // PayrollRun Updates
    await db.execute(sql`
        ALTER TABLE "PayrollRun" 
        ADD COLUMN IF NOT EXISTS "config" jsonb;
    `);

    console.log("✅ Migration Complete: Added Tax & Deduction configuration fields.");
    process.exit(0);
}

main().catch(console.error);
