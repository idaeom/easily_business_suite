
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Migrating Appraisals Table for KPIs...");
    const db = await getDb();

    // Add kpis column
    await db.execute(sql`
        ALTER TABLE "Appraisal" 
        ADD COLUMN IF NOT EXISTS "kpis" jsonb DEFAULT '[]'::jsonb;
    `);

    // Add objectiveScore column
    await db.execute(sql`
        ALTER TABLE "Appraisal" 
        ADD COLUMN IF NOT EXISTS "objectiveScore" decimal(5,2);
    `);

    // Add hrComment column
    await db.execute(sql`
        ALTER TABLE "Appraisal" 
        ADD COLUMN IF NOT EXISTS "hrComment" text;
    `);

    console.log("✅ Migration Complete: Added kpis, objectiveScore, hrComment.");
    process.exit(0);
}

main().catch(console.error);
