import "dotenv/config";
import { getDb } from "../db";
import { taskStages } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    const stages = [
        { name: "TODO", color: "#64748b", order: 0 }, // Slate-500
        { name: "IN_PROGRESS", color: "#3b82f6", order: 1 }, // Blue-500
        { name: "DONE", color: "#22c55e", order: 2 }, // Green-500
        { name: "CERTIFIED", color: "#a855f7", order: 3 }, // Purple-500
        { name: "APPROVED", color: "#eab308", order: 4 }, // Yellow-500
    ];

    console.log("Seeding Task Stages...");

    for (const stage of stages) {
        const existing = await db.query.taskStages.findFirst({
            where: eq(taskStages.name, stage.name)
        });

        if (!existing) {
            await db.insert(taskStages).values(stage);
            console.log(`Created stage: ${stage.name}`);
        } else {
            console.log(`Stage exists: ${stage.name}`);
        }
    }
    process.exit(0);
}

main();
