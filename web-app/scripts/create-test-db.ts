import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const dbUrl = process.env.DATABASE_URL; // Connect to default DB first
    if (!dbUrl) throw new Error("DATABASE_URL not found");

    const client = new Client({
        connectionString: dbUrl,
    });

    await client.connect();

    try {
        // Check if database exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'web_app_test'");
        if (res.rowCount === 0) {
            console.log("Creating database 'web_app_test'...");
            // Cannot run CREATE DATABASE inside a transaction block, so we use simple query
            await client.query("CREATE DATABASE web_app_test");
            console.log("Database created successfully.");
        } else {
            console.log("Database 'web_app_test' already exists.");
        }
    } catch (err) {
        console.error("Error creating database:", err);
    } finally {
        await client.end();
    }
}

main();
