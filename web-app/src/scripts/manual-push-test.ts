
import "dotenv/config";
import { spawn } from "child_process";

const base = process.env.DATABASE_URL;
if (!base) {
    console.error("DATABASE_URL not found");
    process.exit(1);
}

const testUrl = process.env.DATABASE_URL_TEST ||
    (base + (base.includes("?") ? "&" : "?") + "options=-c%20search_path=test");

console.log("🚀 Spawning drizzle-kit push for Test DB...");

const child = spawn("npx", ["drizzle-kit", "push"], {
    stdio: "inherit",
    env: {
        ...process.env,
        DATABASE_URL: testUrl
    },
    shell: true
});

child.on("exit", (code) => {
    console.log(`Child exited with code ${code}`);
    process.exit(code || 0);
});
