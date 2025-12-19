import { getDb } from "@/db";
import { taskStages } from "@/db/schema";

async function main() {
    const db = await getDb();
    const stages = await db.select().from(taskStages);
    console.log("Stage Names:", stages.map(s => s.name));
    console.log("Total Stages:", stages.length);
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
