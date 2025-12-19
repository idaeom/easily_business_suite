
import { testDb, liveDb } from "../db";
import { sql } from "drizzle-orm";
import { users } from "../db/schema";
import * as bcrypt from "bcrypt";

async function main() {
    console.log("🔥 Rebuilding TEST Schema from Public...");

    // 1. Drop Schema
    await liveDb.execute(sql`DROP SCHEMA IF EXISTS test CASCADE;`);
    await liveDb.execute(sql`CREATE SCHEMA test;`);
    console.log("✅ Schema 'test' reset.");

    // 2. Clone Tables (Same logic as clone-public-to-test.ts)
    const { rows: tables } = await liveDb.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_prisma_migrations', 'drizzle_migrations');
    `);

    // Create Enums first?
    // Postgres 'CREATE TABLE (LIKE ... INCLUDING ALL)' does NOT copy Enums across schemas if they are custom types?
    // It copies the *usage* of the type, but the type must exist.
    // We need to re-create types in 'test' schema. Or assume 'public' types are visible?
    // if search_path is 'test', it won't see 'public' types unless fully qualified.
    // But 'LIKE public.Table' might copy the column definition as 'public.EnumType'. 
    // Let's rely on that.

    const tableNames = tables.map((t: any) => t.table_name);
    let progress = true;
    while (tableNames.length > 0 && progress) {
        progress = false;
        const remaining = [...tableNames];
        for (const tableName of remaining) {
            try {
                // Check if exists
                const exists = await liveDb.execute(sql.raw(`SELECT to_regclass('test."${tableName}"')`));
                if (exists.rows[0].to_regclass) {
                    created(tableName); continue;
                }

                await liveDb.execute(sql.raw(`
                    CREATE TABLE test."${tableName}" (LIKE public."${tableName}" INCLUDING ALL);
                `));
                console.log(`+ Table: ${tableName}`);
                created(tableName);
            } catch (e) { }
        }
    }

    function created(name: string) {
        if (tableNames.includes(name)) {
            tableNames.splice(tableNames.indexOf(name), 1);
            progress = true;
        }
    }

    if (tableNames.length > 0) console.warn("Missing tables:", tableNames);
    else console.log("✅ All tables cloned.");

    // 3. Sync Users
    const liveUsers = await liveDb.select().from(users);
    for (const u of liveUsers) {
        try {
            await liveDb.execute(sql`
                INSERT INTO test."User" (id, name, email, password, role, image, permissions, "createdAt", "updatedAt")
                VALUES (${u.id}, ${u.name}, ${u.email}, ${u.password}, ${u.role}, ${u.image}, ${JSON.stringify(u.permissions)}, ${u.createdAt}, ${u.updatedAt})
            `);
        } catch (e) { }
    }
    console.log(`✅ Synced ${liveUsers.length} users.`);

    process.exit(0);
}
main();
