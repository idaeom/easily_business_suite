
import { liveDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🛠️  Fixing Dispatch Table Column: customerId -> contactId");

    // Public Schema
    try {
        await liveDb.execute(sql`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Dispatch' AND column_name='customerId') THEN
                    ALTER TABLE "public"."Dispatch" RENAME COLUMN "customerId" TO "contactId";
                    RAISE NOTICE 'Renamed customerId to contactId in public.Dispatch';
                END IF;
            END $$;
        `);
        console.log("✅ Public Schema patched.");
    } catch (e: any) {
        console.log(`❌ Public Patch Failed: ${e.message}`);
    }

    // Test Schema
    try {
        await liveDb.execute(sql`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='test' AND table_name='Dispatch' AND column_name='customerId') THEN
                    ALTER TABLE "test"."Dispatch" RENAME COLUMN "customerId" TO "contactId";
                    RAISE NOTICE 'Renamed customerId to contactId in test.Dispatch';
                END IF;
            END $$;
        `);
        console.log("✅ Test Schema patched.");
    } catch (e: any) {
        console.log(`❌ Test Patch Failed: ${e.message}`);
    }

    process.exit(0);
}

main();
