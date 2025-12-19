
import { liveDb, testDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🚀 Cloning PUBLIC schema to TEST schema...");

    // 1. Get List of Tables in Public
    const { rows: tables } = await liveDb.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_prisma_migrations', 'drizzle_migrations');
    `);

    // We need to order them by dependency (Users -> Teams -> Accounts -> etc.)
    // Simple approach: Create all tables, then add FKs? 
    // Or just try/catch retry loop until all created.

    console.log(`Found ${tables.length} tables to clone.`);

    // 2. Introspect Columns & Generate create statements
    // Actually, a simpler hack:
    // Use `pg_dump` style logic? No, we don't have shell access easily.
    // We can use `CREATE TABLE test."X" (LIKE public."X" INCLUDING ALL)`
    // Postgres supports this! `CREATE TABLE new_table (LIKE old_table INCLUDING ALL)`
    // This copies structure, constraints, indexes, defaults!
    // But it doesn't copy FKs? "INCLUDING ALL" includes defaults, constraints, indexes. 
    // It DOES NOT include Foreign Keys in some versions?
    // "INCLUDING CONSTRAINTS" includes check constraints, but NOT foreign keys.
    // So we might need to recreate FKs separately.

    // Let's try `INCLUDING ALL`.

    // We must handle dependencies or disable triggers?
    // In `test` schema, strict FKs are good.
    // But if we create Table B before Table A, FK fails.

    const tableNames = tables.map((t: any) => t.table_name);
    const created = new Set<string>();

    // Retry loop for dependencies
    let progress = true;
    while (tableNames.length > 0 && progress) {
        progress = false;
        const remaining = [...tableNames];

        for (const tableName of remaining) {
            try {
                // Check if exists
                const exists = await testDb.execute(sql`
                   SELECT to_regclass(${`test."${tableName}"`})
                `);

                if (exists.rows[0].to_regclass) {
                    // console.log(`Table ${tableName} already exists.`);
                    created.add(tableName);
                    tableNames.splice(tableNames.indexOf(tableName), 1);
                    progress = true;
                    continue;
                }

                // Try Clone
                // Note: We strip FKs initially? No, LIKE copies constraints immediately.
                // Wait, `LIKE source INCLUDING ALL` attempts to copy constraints.
                // If it fails due to missing FK target, we catch and wait.

                await testDb.execute(sql.raw(`
                    CREATE TABLE test."${tableName}" (LIKE public."${tableName}" INCLUDING ALL);
                `));

                // ADJUSTMENT: The `LIKE` logic references the *same* FK targets (schema public)?
                // No, it copies the definitions. If the definition says `REFERENCES "User"`, it resolves to current schema?
                // Or if it says `REFERENCES public."User"`, it stays public.
                // Drizzle-generated FKs usually don't verify schema unless specified.
                // But `LIKE` is tricky with FKs.
                // Actually, `INCLUDING ALL` DOES NOT copy Foreign Keys standardly in Postgres.
                // This is GOOD! We can create tables first, then ADD FKs later.

                console.log(`✅ Created table: ${tableName}`);
                created.add(tableName);
                tableNames.splice(tableNames.indexOf(tableName), 1);
                progress = true;
            } catch (e: any) {
                // e.g. type missing?
                console.log(`⚠️ Skipping ${tableName} (dependency?): ${e.message}`);
            }
        }
    }

    if (tableNames.length > 0) {
        console.error("❌ Failed to create some tables:", tableNames);
    } else {
        console.log("✅ All base tables created.");
    }

    // 3. Fix Enums?
    // Enums are types. We might have missed them if table creation failed on missing type.
    // `clone-public-to-test.ts` should probably copy types first.
    // I did some enums manually previously.

    // 4. SEQUENCES? 
    // `INCLUDING ALL` copies identity/defaults (sequences).

    process.exit(0);
}
main();
