
import { execSync } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

// Construct Test Connection String
// Force search_path=test
const originalUrl = process.env.DATABASE_URL;
if (!originalUrl) throw new Error("DATABASE_URL missing");

const separator = originalUrl.includes("?") ? "&" : "?";
const testUrl = `${originalUrl}${separator}options=-c%20search_path=test`;

console.log("🚀 Pushing Schema to TEST Environment...");
// console.log("URL:", testUrl.replace(/:[^:]+@/, ":***@")); // Log masked

try {
    execSync(`npx drizzle-kit push`, {
        stdio: "inherit",
        env: {
            ...process.env,
            DATABASE_URL: testUrl
        }
    });
    console.log("✅ Test Schema Updated.");
} catch (e) {
    console.error("❌ Push Failed.");
    process.exit(1);
}
