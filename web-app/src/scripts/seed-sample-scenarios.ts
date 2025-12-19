
import "dotenv/config";
import { getDb } from "../db";
import {
    users,
    tasks,
    taskStages,
    expenses,
    expenseCategories,
    budgets,
    accounts,
    transactions,
    ledgerEntries,
    teams
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { addDays, subDays } from "date-fns";

async function main() {
    console.log("🌱 Seeding Sample Scenarios...");
    const db = await getDb();

    // --- 1. Seed Users ---
    console.log("Creating Users...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Admin
    let adminUser = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });
    if (!adminUser) {
        const [newUser] = await db.insert(users).values({
            name: "Admin User",
            email: "admin@example.com",
            password: hashedPassword,
            role: "ADMIN",
            permissions: ["ALL"],
        }).returning();
        adminUser = newUser;
        console.log("✅ Created Admin User");
    }

    // Employee
    let employeeUser = await db.query.users.findFirst({ where: eq(users.email, "employee@example.com") });
    if (!employeeUser) {
        const [newUser] = await db.insert(users).values({
            name: "John Employee",
            email: "employee@example.com",
            password: hashedPassword,
            role: "USER",
            permissions: ["CREATE_EXPENSE", "VIEW_TASKS"],
        }).returning();
        employeeUser = newUser;
        console.log("✅ Created Employee User");
    }

    // Manager
    let managerUser = await db.query.users.findFirst({ where: eq(users.email, "manager@example.com") });
    if (!managerUser) {
        const [newUser] = await db.insert(users).values({
            name: "Jane Manager",
            email: "manager@example.com",
            password: hashedPassword,
            role: "ADMIN", // Using Admin for approval rights simplification
            permissions: ["APPROVE_EXPENSE", "MANAGE_TASKS"],
        }).returning();
        managerUser = newUser;
        console.log("✅ Created Manager User");
    }

    // --- 2. Seed Tasks & Stages ---
    console.log("Creating Tasks...");
    const stages = await db.select().from(taskStages);
    const todoStage = stages.find(s => s.name === "TODO");
    const inProgressStage = stages.find(s => s.name === "IN_PROGRESS");
    const doneStage = stages.find(s => s.name === "DONE");
    const approvedStage = stages.find(s => s.name === "APPROVED");

    if (!todoStage || !inProgressStage || !doneStage) throw new Error("Stages not found. Run seed-stages first.");

    // Task 1: Pending Project (TODO)
    await db.insert(tasks).values({
        uniqueNumber: "TSK-001",
        title: "Q4 Marketing Campaign",
        description: "Plan and execute the end-of-year marketing blitz.",
        status: "TODO",
        stageId: todoStage.id,
        assigneeId: employeeUser?.id,
        dueDate: addDays(new Date(), 14),
        createdAt: subDays(new Date(), 2),
    }).onConflictDoNothing();

    // Task 2: Active Development (IN_PROGRESS)
    const [task2] = await db.insert(tasks).values({
        uniqueNumber: "TSK-002",
        title: "Website Redesign",
        description: "Implement the new homepage layout.",
        status: "IN_PROGRESS",
        stageId: inProgressStage.id,
        assigneeId: employeeUser?.id,
        dueDate: addDays(new Date(), 7),
        createdAt: subDays(new Date(), 5),
    }).onConflictDoNothing().returning();

    // Task 3: Completed Report (DONE)
    await db.insert(tasks).values({
        uniqueNumber: "TSK-003",
        title: "Financial Audit Q3",
        description: "Review all expenses for the last quarter.",
        status: "DONE",
        stageId: doneStage.id,
        assigneeId: managerUser?.id,
        dueDate: subDays(new Date(), 1),
        createdAt: subDays(new Date(), 10),
    }).onConflictDoNothing();

    // --- 3. Seed Expenses ---
    console.log("Creating Expenses...");
    const travelCat = await db.query.expenseCategories.findFirst({ where: eq(expenseCategories.name, "Travel") });
    const softwareCat = await db.query.expenseCategories.findFirst({ where: eq(expenseCategories.name, "Software") });
    const officeCat = await db.query.expenseCategories.findFirst({ where: eq(expenseCategories.name, "Office Supplies") });

    // Expense 1: Pending Approval (Travel)
    if (travelCat) {
        const [existing] = await db.select().from(expenses).where(eq(expenses.description, "Flight to Lagos for Client Meeting")).limit(1);
        if (!existing) {
            await db.insert(expenses).values({
                description: "Flight to Lagos for Client Meeting",
                amount: "150000",
                status: "PENDING",
                category: travelCat.id,
                requesterId: employeeUser!.id,
                incurredAt: new Date(),
            });
        }
    }

    // Expense 2: Approved (Software) linked to Task 2
    if (softwareCat && task2) {
        const [existing] = await db.select().from(expenses).where(eq(expenses.description, "AWS Hosting Credits")).limit(1);
        if (!existing) {
            await db.insert(expenses).values({
                description: "AWS Hosting Credits",
                amount: "50000",
                status: "APPROVED",
                category: softwareCat.id,
                requesterId: employeeUser!.id,
                taskId: task2.id,
                incurredAt: subDays(new Date(), 2),
            });
        }
    }

    // Expense 3: Paid (Office Supplies) - Needs Transaction & Ledger
    if (officeCat) {
        const amount = "25000";
        // Check by description to avoid syntax errors with complex conditions
        const [existingPaid] = await db.select().from(expenses).where(eq(expenses.description, "New Office Chairs")).limit(1);

        if (!existingPaid) {
            const [paidExpense] = await db.insert(expenses).values({
                description: "New Office Chairs",
                amount: amount,
                status: "DISBURSED",
                category: officeCat.id,
                requesterId: managerUser!.id,
                incurredAt: subDays(new Date(), 5),
            }).returning();

            // Create Transaction for Paid Expense
            const [txn] = await db.insert(transactions).values({
                description: "Payment for Office Chairs",
                status: "POSTED",
                date: new Date(),
            }).returning();

            // Ledger: Credit Bank, Debit Expense
            const bankAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1002") }); // Main Bank
            const expenseAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "6400") }); // Office Supplies

            if (bankAccount && expenseAccount) {
                await db.insert(ledgerEntries).values([
                    {
                        transactionId: txn.id,
                        accountId: bankAccount.id,
                        amount: amount,
                        direction: "CREDIT", // Money leaving bank
                        description: "Outflow for Chairs"
                    },
                    {
                        transactionId: txn.id,
                        accountId: expenseAccount.id,
                        amount: amount,
                        direction: "DEBIT", // Expense increasing
                        description: "Expense for Chairs"
                    }
                ]);
            }
        }
    }

    // --- 4. Seed Budgets (Update Amounts) ---
    console.log("Updating Budgets...");
    if (softwareCat) {
        await db.update(budgets)
            .set({ amount: "500000" })
            .where(eq(budgets.categoryId, softwareCat.id));
    }
    if (officeCat) {
        await db.update(budgets)
            .set({ amount: "20000" }) // Intentionally low to show "Over Budget"
            .where(eq(budgets.categoryId, officeCat.id));
    }

    // --- 5. Seed Finance (Inflow) ---
    console.log("Creating Finance Inflow...");
    const bankAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1002") });
    const salesAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "4000") }); // Sales Revenue

    if (bankAccount && salesAccount) {
        const inflowAmount = "2500000";

        // Check duplication loosely
        const lastTxn = await db.query.transactions.findFirst({
            orderBy: (t, { desc }) => [desc(t.createdAt)],
            where: eq(transactions.description, "Q4 Initial Funding")
        });

        if (!lastTxn) {
            const [txn] = await db.insert(transactions).values({
                description: "Q4 Initial Funding",
                status: "POSTED",
                date: subDays(new Date(), 10),
            }).returning();

            await db.insert(ledgerEntries).values([
                {
                    transactionId: txn.id,
                    accountId: bankAccount.id,
                    amount: inflowAmount,
                    direction: "DEBIT", // Money entering bank (Asset +)
                    description: "Capital Injection"
                },
                {
                    transactionId: txn.id,
                    accountId: salesAccount.id,
                    amount: inflowAmount,
                    direction: "CREDIT", // Revenue increasing
                    description: "Sales Revenue"
                }
            ]);

            // Update Bank Balance
            // Note: In real app, balance should be aggregate of ledger, but for simple seed we allow manual set or rely on computed
            // For now, let's just make sure the ledger is there.
        }
    }

    // --- 6. Complex Scenarios (New Request) ---
    console.log("Creating Complex Scenarios...");

    // 6.1 Project with Subtasks
    const [projectTask] = await db.insert(tasks).values({
        uniqueNumber: "PRJ-2025-A",
        title: "Enterprise ERP Rollout",
        description: "Full implementation of the new ERP system for the client.",
        status: "IN_PROGRESS",
        stageId: inProgressStage.id,
        assigneeId: managerUser?.id,
        dueDate: addDays(new Date(), 60),
    }).onConflictDoNothing().returning(); // Returning might fail if conflict, but we assume clean or new

    // If project created (or found, if we implemented find), add subtasks
    // For simplicity in seed, let's just query it if insert returned nothing (conflict)
    let finalProjectTask: typeof projectTask | undefined = projectTask;
    if (!finalProjectTask) {
        finalProjectTask = await db.query.tasks.findFirst({ where: eq(tasks.uniqueNumber, "PRJ-2025-A") });
    }

    if (finalProjectTask) {
        // Subtask 1: Design Phase
        await db.insert(tasks).values({
            uniqueNumber: "PRJ-2025-A-1",
            title: "System Architecture Design",
            description: "Define database schema and API endpoints.",
            status: "DONE",
            stageId: doneStage.id,
            assigneeId: employeeUser?.id,
            parentId: finalProjectTask.id,
            dueDate: subDays(new Date(), 5),
        }).onConflictDoNothing();

        // Subtask 2: Frontend Implementation
        await db.insert(tasks).values({
            uniqueNumber: "PRJ-2025-A-2",
            title: "Frontend Development",
            description: "Implement React components and Tailwind styles.",
            status: "IN_PROGRESS",
            stageId: inProgressStage.id,
            assigneeId: employeeUser?.id,
            parentId: finalProjectTask.id,
            dueDate: addDays(new Date(), 10),
        }).onConflictDoNothing();
    }

    // 6.2 Task with Multiple Expenses
    const [onsiteTask] = await db.insert(tasks).values({
        uniqueNumber: "TSK-ONSITE",
        title: "On-site Client Training",
        description: "Travel to Abuja for 3-day workshop.",
        status: "TODO",
        stageId: todoStage.id,
        assigneeId: employeeUser?.id,
        dueDate: addDays(new Date(), 20),
    }).onConflictDoNothing().returning();

    let finalOnsiteTask: typeof onsiteTask | undefined = onsiteTask;
    if (!finalOnsiteTask) {
        finalOnsiteTask = await db.query.tasks.findFirst({ where: eq(tasks.uniqueNumber, "TSK-ONSITE") });
    }

    if (finalOnsiteTask && travelCat) {
        // Expense 1: Flight
        const [flightExp] = await db.select().from(expenses).where(eq(expenses.description, "Roundtrip Flight to Abuja")).limit(1);
        if (!flightExp) {
            await db.insert(expenses).values({
                description: "Roundtrip Flight to Abuja",
                amount: "220000",
                status: "APPROVED",
                category: travelCat.id,
                requesterId: employeeUser!.id,
                taskId: finalOnsiteTask.id,
                incurredAt: new Date(),
            });
        }

        // Expense 2: Hotel
        const [hotelExp] = await db.select().from(expenses).where(eq(expenses.description, "Hotel Stay (3 Nights)")).limit(1);
        if (!hotelExp) {
            await db.insert(expenses).values({
                description: "Hotel Stay (3 Nights)",
                amount: "180000",
                status: "PENDING", // Partial approval scenario?
                category: travelCat.id,
                requesterId: employeeUser!.id,
                taskId: finalOnsiteTask.id,
                incurredAt: new Date(),
            });
        }

        // Expense 3: Per Diem
        const [perDiemExp] = await db.select().from(expenses).where(eq(expenses.description, "Per Diem Allowance")).limit(1);
        if (!perDiemExp) {
            await db.insert(expenses).values({
                description: "Per Diem Allowance",
                amount: "45000",
                status: "PENDING",
                category: travelCat.id,
                requesterId: employeeUser!.id,
                taskId: finalOnsiteTask.id,
                incurredAt: new Date(),
            });
        }
    }

    // --- 6.3 More Finance Records ---
    if (bankAccount && salesAccount) {
        // Service Revenue
        const serviceRevAcc = await db.query.accounts.findFirst({ where: eq(accounts.code, "4100") });
        const [serviceTxn] = await db.insert(transactions).values({
            description: "Service Retainer - Dec",
            status: "POSTED",
            date: new Date(),
        }).onConflictDoNothing().returning();

        // If txn created (or found - though onConflictDoNothing returns empty if found, so we might skip ledger if existing)
        // Ideally we check existence first.
        let finalServiceTxn: typeof serviceTxn | undefined = serviceTxn;
        if (!finalServiceTxn) {
            finalServiceTxn = await db.query.transactions.findFirst({ where: eq(transactions.description, "Service Retainer - Dec") });
        }

        if (finalServiceTxn && bankAccount && serviceRevAcc) {
            // Check if ledger entries exist, if not create
            const existingEntries = await db.query.ledgerEntries.findFirst({ where: eq(ledgerEntries.transactionId, finalServiceTxn.id) });
            if (!existingEntries) {
                await db.insert(ledgerEntries).values([
                    {
                        transactionId: finalServiceTxn.id,
                        accountId: bankAccount.id,
                        amount: "500000",
                        direction: "DEBIT",
                        description: "Inflow from Client"
                    },
                    {
                        transactionId: finalServiceTxn.id,
                        accountId: serviceRevAcc.id,
                        amount: "500000",
                        direction: "CREDIT",
                        description: "Service Revenue"
                    }
                ]);
            }
        }
    }

    // --- 7. Fix/Update Account Links for Expenses ---
    console.log("Linking Expenses to Accounts...");
    const travelAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "6500") }); // Travel & Logistics
    const softwareAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "6200") }); // Utilities (proxy for Software)
    const officeAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "6400") }); // Office Supplies

    // Helper to update expense
    const updateExpenseAccount = async (desc: string, accId: string | undefined, catId: string | undefined) => {
        if (!accId || !catId) return;
        await db.update(expenses)
            .set({ expenseAccountId: accId, category: catId })
            .where(eq(expenses.description, desc));
    };

    if (travelCat && travelAccount) {
        await updateExpenseAccount("Flight to Lagos for Client Meeting", travelAccount.id, travelCat.id);
        await updateExpenseAccount("Roundtrip Flight to Abuja", travelAccount.id, travelCat.id);
        await updateExpenseAccount("Hotel Stay (3 Nights)", travelAccount.id, travelCat.id);
        await updateExpenseAccount("Per Diem Allowance", travelAccount.id, travelCat.id);
    }

    if (softwareCat && softwareAccount) {
        await updateExpenseAccount("AWS Hosting Credits", softwareAccount.id, softwareCat.id);
    }

    if (officeCat && officeAccount) {
        await updateExpenseAccount("New Office Chairs", officeAccount.id, officeCat.id);
    }

    console.log("✅ Sample Scenarios Seeded!");
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seeding Failed:", err);
    process.exit(1);
});
