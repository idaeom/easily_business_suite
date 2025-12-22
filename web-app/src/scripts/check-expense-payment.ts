
import { getDb } from "../db";
import {
    users, expenses, expenseCategories, accounts, transactions, ledgerEntries, payrollRuns
} from "../db/schema";
import { DisbursementService } from "../lib/disbursement";
import { OtpService } from "../lib/otp";
import { eq, desc } from "drizzle-orm";

async function main() {
    console.log("Starting Expense Payment Verification...");
    const db = await getDb();

    // 0. Setup: Create Requester
    const email = `requester_${Date.now()}@test.com`;
    // Admin role required to bypass some permissions or permission check logic
    const [user] = await db.insert(users).values({
        email,
        name: "Test Requester",
        role: "ADMIN"
    }).returning();

    // Setup Accounts (Bank & Liability)
    let bankAcc = await db.query.accounts.findFirst({ where: eq(accounts.code, "1100") }); // Cash/Bank
    let liabilityAcc = await db.query.accounts.findFirst({ where: eq(accounts.code, "2400") }); // Payroll Payable
    let expenseAcc = await db.query.accounts.findFirst({ where: eq(accounts.code, "6000") }); // Salaries Expense

    // Fallback if missing
    if (!bankAcc) {
        [bankAcc] = await db.insert(accounts).values({ name: "Test Bank", code: "1100", type: "ASSET", balance: "1000000" }).returning();
    } else {
        // Ensure balance is sufficient
        await db.update(accounts).set({ balance: "1000000" }).where(eq(accounts.id, bankAcc.id));
    }

    if (!liabilityAcc) {
        [liabilityAcc] = await db.insert(accounts).values({ name: "Payroll Payable", code: "2400", type: "LIABILITY", balance: "0" }).returning();
    }
    if (!expenseAcc) {
        // usually exists
    }

    // Generate OTP for this user
    const otp = await OtpService.generateOtp(user.email!);
    console.log(`Generated OTP: ${otp}`);

    // 1. Scenario A: Payroll Disbursement (Accrued)
    console.log("\n--- Scenario A: Payroll Disbursement (Accrued) ---");
    // Create Mock Payroll-Linked Expense
    const [pExpense] = await db.insert(expenses).values({
        description: "Payroll Run Test",
        amount: "50000",
        status: "APPROVED",
        requesterId: user.id,
        expenseAccountId: expenseAcc?.id,
    }).returning();

    // Link to PayrollRun
    await db.insert(payrollRuns).values({
        month: 1, year: 2025,
        totalAmount: "50000",
        status: "APPROVED",
        expenseId: pExpense.id,
        certifierId: user.id
    });

    console.log(`Created Payroll Expense: ${pExpense.id}`);

    // Pay it via DisbursementService
    // Params: expenseId, sourceAccountId, userId, otp, mode, provider
    await DisbursementService.disburseExpense(
        pExpense.id,
        bankAcc.id,
        user.id,
        otp,
        "MANUAL"
    );
    console.log("Paid Payroll Expense");

    // Verify GL
    // Note: DisbursementService uses FinanceService which might structure Description differently
    // It logs "Disbursement: {desc} (Ref: ...)"
    const txA = await db.query.transactions.findFirst({
        orderBy: [desc(transactions.date)], // Correct usage
    });

    // We check the latest transaction entries
    if (txA) {
        // Double check it's ours
        if (txA.description?.includes(pExpense.description)) {
            const entries = await db.query.ledgerEntries.findMany({ where: eq(ledgerEntries.transactionId, txA.id), with: { account: true } });
            entries.forEach(e => console.log(` - ${Number(e.amount) < 0 ? 'CREDIT' : 'DEBIT'} ${Math.abs(Number(e.amount))} -> ${e.account.name} (${e.account.code})`));

            const dr = entries.find(e => Number(e.amount) > 0); // Positive is Debit in DisbursementService logic?
            // DisbursementService calls FinanceService.createTransaction:
            // entries: [ { amount: -val } (Credit Bank), { amount: +val } (Debit Expense/Liability) ]

            if (dr?.account.code === "2400") console.log("SUCCESS: Debited Liability (Correct for Payroll)");
            else console.error(`FAILURE: Debited ${dr?.account.code} instead of 2400`);
        }
    }

    // 2. Scenario B: Direct Expense (Immediate)
    console.log("\n--- Scenario B: General Expense (Direct) ---");

    // Need fresh OTP? OTP is consumed.
    const otp2 = await OtpService.generateOtp(user.email!);

    // Create General Expense (No Payroll Link)
    const [gExpense] = await db.insert(expenses).values({
        description: "Office Supplies",
        amount: "5000",
        status: "APPROVED",
        requesterId: user.id,
        expenseAccountId: expenseAcc?.id, // Direct to Expense
    }).returning();

    console.log(`Created General Expense: ${gExpense.id}`);

    // Pay it
    await DisbursementService.disburseExpense(
        gExpense.id,
        bankAcc.id,
        user.id,
        otp2,
        "MANUAL"
    );
    console.log("Paid General Expense");

    const txB = await db.query.transactions.findFirst({
        orderBy: [desc(transactions.date)],
    });

    if (txB && txB.description?.includes(gExpense.description)) {
        const entries = await db.query.ledgerEntries.findMany({ where: eq(ledgerEntries.transactionId, txB.id), with: { account: true } });
        entries.forEach(e => console.log(` - ${Number(e.amount) < 0 ? 'CREDIT' : 'DEBIT'} ${Math.abs(Number(e.amount))} -> ${e.account.name} (${e.account.code})`));

        const dr = entries.find(e => Number(e.amount) > 0);
        if (dr?.account.id === expenseAcc?.id) console.log("SUCCESS: Debited Expense Account (Correct for Direct)");
        else console.error(`FAILURE: Debited ${dr?.account.name} instead of Expense Account`);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
