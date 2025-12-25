import { exec } from "child_process";
import { join } from "path";
import { mkdir } from "fs/promises";
import fs from "fs";

// Load env vars
import dotenv from "dotenv";
dotenv.config();

async function backupDatabase() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not found in environment");
        process.exit(1);
    }

    const backupDir = join(process.cwd(), "backups");

    // Ensure backup directory
    if (!fs.existsSync(backupDir)) {
        await mkdir(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.sql`;
    const filePath = join(backupDir, filename);

    console.log(`Starting backup to ${filePath}...`);

    // Using pg_dump
    // Ensure pg_dump is in your PATH or change this to absolute path
    // NOTE: This assumes password is in the DB Connection String
    const command = `pg_dump "${dbUrl}" -f "${filePath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Backup failed: ${error.message}`);
            return;
        }
        if (stderr) {
            // pg_dump writes info to stderr often, not always error
            console.log(`pg_dump output: ${stderr}`);
        }
        console.log(`Backup completed successfully: ${filename}`);
    });
}

backupDatabase();
