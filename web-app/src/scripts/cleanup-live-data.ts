
import { liveDb } from "../db"; // Import liveDb directly to be sure
import { expenses, tasks, notifications, comments } from "../db/schema";
import { eq, like, and } from "drizzle-orm";

async function main() {
    console.log("Cleaning up accidental test data from LIVE DB...");

    // 1. Delete the Test Expense
    const expenseDesc = "Team Lunch - Notification Test";
    const expense = await liveDb.query.expenses.findFirst({
        where: eq(expenses.description, expenseDesc)
    });

    if (expense) {
        console.log(`Deleting expense: ${expense.id} - ${expense.description}`);

        // Delete related comments first (cascade usually handles this, but being safe)
        // await liveDb.delete(comments).where(eq(comments.relatedEntityId, expense.id));
        // await liveDb.delete(notifications).where(eq(notifications.relatedEntityId, expense.id));

        await liveDb.delete(expenses).where(eq(expenses.id, expense.id));
    } else {
        console.log("No matching expense found in Live DB.");
    }

    // 2. Delete the Test Task
    const taskTitle = "Review Notification Logic";
    const task = await liveDb.query.tasks.findFirst({
        where: eq(tasks.title, taskTitle)
    });

    if (task) {
        console.log(`Deleting task: ${task.id} - ${task.title}`);

        // Delete related notifications
        // await liveDb.delete(notifications).where(eq(notifications.relatedEntityId, task.id));

        await liveDb.delete(tasks).where(eq(tasks.id, task.id));
    } else {
        console.log("No matching task found in Live DB.");
    }

    // 3. Delete leftover Manual notifications if any (linked by message content if entity ID was lost)
    // "Team Lunch - Notification Test", "Hi Admin...", "You have been assigned to task"

    console.log("Cleanup Complete.");
}

main().catch(console.error);
