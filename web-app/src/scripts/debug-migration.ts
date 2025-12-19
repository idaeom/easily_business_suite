
import { liveDb } from "../db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("🔍 Debugging Migration 0001...");

    const migrationPath = path.join(process.cwd(), "drizzle", "0001_worthless_vanisher.sql");
    const content = fs.readFileSync(migrationPath, "utf-8");
    const statements = content.split("--> statement-breakpoint");

    console.log(`Found ${statements.length} statements.`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt) continue;

        console.log(`\nExecuting Statement #${i + 1}:`);
        console.log(stmt.substring(0, 100) + "...");

        try {
            await liveDb.execute(sql.raw(stmt));
            console.log("✅ Success");
        } catch (error: any) {
            console.error("❌ FAILED:");
            console.error(error.message);
            // console.error(error); // Detailed logs if needed

            // We proceed to check others or stop? 
            // In a real migration, it stops. But for debug, let's stop to fix.
            // But wait, if it failed because it exists, we might want to ignore?
            if (error.code === '42710' || error.code === '42P07') {
                console.log("⚠️  duplicate_object/duplicate_table - would have blocked migration.");
                process.exit(1);
            } else {
                console.log("⚠️  Other error.");
                process.exit(1);
            }
        }
    }

    console.log("\n✅ All statements passed (or debug stopped).");
    process.exit(0);
}

main();
