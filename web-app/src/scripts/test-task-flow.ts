
import { TaskService } from "../services/task-service";

async function runTaskFlowTest() {
    console.log("🚀 Starting Task Flow Integration Test");

    try {
        const db = await import("../db").then(m => m.getDb());
        const { users, auditLogs } = await import("../db/schema");
        const { eq, desc } = await import("drizzle-orm");

        // 1. Setup Data
        console.log("\n--- 1. Setting up Users ---");
        let admin = await db.query.users.findFirst({ where: eq(users.email, "admin@test.com") });
        if (!admin) throw new Error("Admin not found");

        let worker = await db.query.users.findFirst({ where: eq(users.email, "worker@test.com") });
        if (!worker) throw new Error("Worker not found. Run HR test first.");

        // 2. Create Task
        console.log("\n--- 2. Create Task ---");
        const task = await TaskService.createTask({
            title: "Implement Login Page",
            description: "Frontend implementation",
            dueDate: new Date()
        }, admin.id);
        console.log("✅ Task Created:", task.uniqueNumber);

        // 3. Assign Task
        console.log("\n--- 3. Assign Task ---");
        await TaskService.assignTask(task.id, worker.id, admin.id);
        console.log(`✅ Task Assigned to ${worker.name}`);

        // 4. Update Status
        console.log("\n--- 4. Update Status ---");
        await TaskService.updateStatus(task.id, "IN_PROGRESS", worker.id);
        console.log("✅ Status Updated: IN_PROGRESS");

        await TaskService.updateStatus(task.id, "DONE", worker.id);
        console.log("✅ Status Updated: DONE");

        // 5. Verify Audit Log
        console.log("\n--- 5. Verify Audit Log ---");
        const logs = await db.query.auditLogs.findMany({
            where: eq(auditLogs.entityId, task.id),
            orderBy: [desc(auditLogs.createdAt)]
        });

        console.log(`Found ${logs.length} Audit Logs:`);
        logs.forEach(l => console.log(` - [${l.action}] ${(l.details as any).message}`));

        const hasCreate = logs.some(l => l.action === "CREATE_TASK");
        const hasAssign = logs.some(l => l.action === "ASSIGN_TASK");
        const hasUpdate = logs.some(l => l.action === "UPDATE_STATUS");

        if (hasCreate && hasAssign && hasUpdate) {
            console.log("   -> Audit Log Check PASS");
        } else {
            console.error("   -> Audit Log Check FAIL");
            process.exit(1);
        }

        console.log("\n🎉 Task Flow Test Completed!");
        process.exit(0);

    } catch (e: any) {
        console.error("\n❌ Task Flow Test Failed:", e);
        process.exit(1);
    }
}

runTaskFlowTest();
