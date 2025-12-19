
import "dotenv/config";
import { getDb } from "../db";
import { budgets, expenseCategories } from "../db/schema";
import { eq, isNull } from "drizzle-orm";
import { startOfYear, endOfYear } from "date-fns";

async function main() {
    console.log("Seeding default budgets...");
    const db = await getDb();

    // 1. Get all categories
    const categories = await db.select().from(expenseCategories);
    console.log(`Found ${categories.length} categories.`);

    const now = new Date();
    const start = startOfYear(now);
    const end = endOfYear(now);

    let createdCount = 0;

    for (const category of categories) {
        // Check if budget exists for this category
        // For simplicity, we just check if ANY budget exists. 
        // In a real app, we might check for the current year.
        const existingBudget = await db.query.budgets.findFirst({
            where: eq(budgets.categoryId, category.id)
        });

        if (!existingBudget) {
            console.log(`Creating default budget for category: ${category.name}`);
            await db.insert(budgets).values({
                categoryId: category.id,
                amount: "0", // Default to 0
                startDate: start,
                endDate: end,
            });
            createdCount++;
        }
    }

    console.log(`Created ${createdCount} default budgets.`);
    process.exit(0);
}

main();
