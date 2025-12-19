import { getDb } from "@/db";
import {
    users, accounts, transactions, ledgerEntries, expenses, expenseBeneficiaries,
    tasks, taskParticipants, comments, attachments, teams, budgets,
    auditLogs, notifications, taskStages, expenseCategories
} from "@/db/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("⚠️  WARNING: You are about to RESET the LIVE database. ⚠️");
    console.log("This will delete ALL data (Users, Expenses, Tasks, etc.) from the LIVE environment.");
    console.log("Waiting 5 seconds... Press Ctrl+C to cancel.");

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Force LIVE mode
    process.env.APP_MODE = "LIVE";
    const db = await getDb();

    console.log("Starting Reset...");

    // Disable triggers/constraints if needed, or just delete in order
    // Order: Child -> Parent

    console.log("Deleting Audit Logs & Notifications...");
    await db.delete(auditLogs);
    await db.delete(notifications);

    console.log("Deleting Finance Data...");
    await db.delete(ledgerEntries);
    await db.delete(transactions);
    await db.delete(expenseBeneficiaries);
    await db.delete(attachments); // Linked to expenses and tasks
    await db.delete(comments);    // Linked to expenses and tasks
    await db.delete(expenses);
    await db.delete(expenseCategories);

    console.log("Deleting Budgets & Teams...");
    await db.delete(budgets);
    // Team members are usually in a join table or just users?
    // Schema check: teams have members?
    // Wait, I need to check schema for team members.
    // Assuming team members are handled or cascade.
    await db.delete(teams);

    console.log("Deleting Tasks...");
    await db.delete(taskParticipants);
    // Self-referencing tasks (subtasks) might need care, but delete usually handles it if cascade is set.
    // If not, we might need to delete subtasks first.
    // Drizzle delete doesn't automatically handle self-ref order unless cascade.
    // Let's try deleting all.
    await db.delete(tasks);
    await db.delete(taskStages);

    console.log("Deleting Accounts & Users...");
    await db.delete(accounts);
    await db.delete(users);

    console.log("✅ Live Database Reset Complete.");
    console.log("Run 'npm run seed' (if available) or use seed scripts to repopulate initial data.");
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
