
import { getDb } from "../db";

async function main() {
    const db = await getDb();
    const users = await db.query.users.findMany();

    console.log("--- Users ---");
    users.forEach(u => {
        console.log(`[${u.role}] ${u.name} (${u.email}) - ID: ${u.id}`);
    });
}

main().catch(console.error);
