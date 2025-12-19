
import { getDb } from "../db";
import { users, expenses, tasks, comments, notifications } from "../db/schema";
import { eq } from "drizzle-orm";
import { CollaborationService } from "../lib/collaboration";
import { ExpenseService } from "../lib/expenses";
import { TaskService } from "../lib/tasks";

async function main() {
    const db = await getDb();

    // 1. Identify Actors
    const adminUser = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });
    const requester = await db.query.users.findFirst({ where: eq(users.email, "user1@test.com") });

    if (!adminUser || !requester) {
        console.error("Could not find Admin or Requester to test notifications.");
        return;
    }

    console.log(`Generating notifications for ${adminUser.name} (${adminUser.email}) from ${requester.name}...`);

    // 2. Action: Create Expense Request
    console.log("Creating Expense Request...");
    const expense = await ExpenseService.createExpense({
        requesterId: requester.id,
        amount: 50000,
        description: "Team Lunch - Notification Test",
        category: "Meals",
        incurredAt: new Date(),
        beneficiaries: []
    });
    console.log(`Expense ${expense.id} created.`);

    // Manual Notification for Expense Request (since Service doesn't do it yet)
    await CollaborationService.createNotification({
        userId: adminUser.id, // Target Admin
        title: "New Expense Request",
        message: `${requester.name} requested ₦50,000 for "Team Lunch - Notification Test".`,
        // type: "EXPENSE_REQUEST",
        // relatedEntityId: expense.id,
        // relatedEntityType: "expense"
    });
    console.log("Simulated 'EXPENSE_REQUEST' notification sent to Admin.");

    // 3. Action: Comment on the Expense (as Requester)
    console.log("Adding Comment to Expense...");
    // We need to fetch the expense again or just use ID. 
    // CollaborationService.addComment notifies the expense owner (requester) usually.
    // If we want to notify Admin, Admin must be 'involved' (e.g. approver) or we explicitly notify.
    // But let's see if adding a comment triggers generic notification.
    await CollaborationService.addComment({
        expenseId: expense.id,
        userId: requester.id,
        content: "Hi Admin, please approve this quickly for test verification."
    });
    // Note: addComment might only notify if there are other participants. 
    // Since Admin hasn't interacted with it yet, they might NOT get this one.
    // So let's force a notification for the comment too to be safe for the "Frontend Test".

    await CollaborationService.createNotification({
        userId: adminUser.id,
        title: "New Comment on Expense",
        message: `${requester.name} commented: "Hi Admin..."`,
        // type: "COMMENT",
        // relatedEntityId: expense.id,
        // relatedEntityType: "expense"
    });
    console.log("Simulated 'COMMENT' notification sent to Admin.");

    // 4. Action: Create Task and Assign to Admin
    console.log("Creating Task assigned to Admin...");
    // TaskService.createTask params: (data, creatorId)
    // Note: detailed assignment logic is restricted in current TaskService (auto-assigns to creator)
    // So we will manually spoof the notification for the test.
    const task = await TaskService.createTask({
        title: "Review Notification Logic",
        description: "Please verify that notifications are working accurately.",
        // status: "TODO",
        // priority: "HIGH",
        dueDate: new Date()
    }, requester.id); // 2nd Argument is creatorId

    console.log(`Task ${task.id} created.`);

    // Manual Notification for Task Assignment (Simulating assignment to Admin)
    await CollaborationService.createNotification({
        userId: adminUser.id,
        title: "Task Assigned",
        message: `You have been assigned to task "${task.uniqueNumber}: ${task.title}"`,
        // type: "TASK_ASSIGNED",
        // relatedEntityId: task.id,
        // relatedEntityType: "task"
    });
    console.log("Simulated 'TASK_ASSIGNED' notification sent to Admin.");

    console.log("--- Notification Generation Complete ---");
}

main().catch(console.error);
