import { getDb } from "@/db";
import { tasks, taskParticipants } from "@/db/schema";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { TaskService } from "@/lib/tasks";

function calculateNextRun(date: Date, interval: string): Date {
    const next = new Date(date);
    if (interval === "DAILY") next.setDate(next.getDate() + 1);
    if (interval === "WEEKLY") next.setDate(next.getDate() + 7);
    if (interval === "MONTHLY") next.setMonth(next.getMonth() + 1);
    return next;
}

async function main() {
    const db = await getDb();
    console.log("Processing recurring tasks...");

    const now = new Date();

    // Find tasks that are recurring and due for a new run
    const dueTasks = await db.query.tasks.findMany({
        where: and(
            isNotNull(tasks.recurrenceInterval),
            lte(tasks.nextRun, now)
        ),
        with: {
            participants: true
        }
    });

    console.log(`Found ${dueTasks.length} recurring tasks due.`);

    for (const task of dueTasks) {
        if (!task.recurrenceInterval) continue;

        console.log(`Spawning new instance for task: ${task.uniqueNumber} - ${task.title}`);

        // Create new task
        // Use assignee as creator, or a system user if null (assuming assigneeId exists)
        const creatorId = task.assigneeId || "system";

        await TaskService.createTask({
            title: task.title,
            description: task.description || undefined,
            definitionOfDone: task.definitionOfDone || undefined,
            // Don't copy recurrenceInterval to the child, otherwise it will also recurse!
            // The child is a single instance.
            participants: task.participants.map((p: any) => ({ userId: p.userId, role: p.role })),
        }, creatorId);

        // Update nextRun of the PARENT task
        const nextRun = calculateNextRun(task.nextRun || now, task.recurrenceInterval);

        await db.update(tasks)
            .set({ nextRun })
            .where(eq(tasks.id, task.id));

        console.log(`Updated next run to: ${nextRun.toISOString()}`);
    }

    console.log("Done.");
}

main()
    .catch(console.error)
    .finally(() => {
        // Close connection if needed, though Drizzle pool handles it
        process.exit(0);
    });
