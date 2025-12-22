
import { getDb } from "../db";

async function main() {
    const db = await getDb();
    const accounts = await db.query.accounts.findMany();
    console.table(accounts.map(a => ({ id: a.id, code: a.code, name: a.name, type: a.type })));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
