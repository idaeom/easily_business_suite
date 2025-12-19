
process.env.APP_MODE = "TEST";

import { getDb } from "../db";
import { accounts, expenses, expenseBeneficiaries, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { DisbursementService } from "../lib/disbursement";
import { OtpService } from "../lib/otp";

async function verifyExpenseFlow() {
    const db = await getDb();
    console.log("💸 Verifying Expense Flow...");

    // 1. Get or Create Admin User
    let admin = await db.query.users.findFirst({
        where: eq(users.email, "admin@example.com")
    });

    if (!admin) {
        const [newUser] = await db.insert(users).values({
            name: "Admin User",
            email: "admin@example.com",
            role: "ADMIN",
            permissions: ["EXPENSE_PAY", "EXPENSE_APPROVE"]
        }).returning();
        admin = newUser;
        console.log("✅ Created Admin User");
    }

    // 2. Get Source Account (Paystack Wallet)
    const wallet = await db.query.accounts.findFirst({
        where: eq(accounts.provider, "PAYSTACK")
    });

    if (!wallet) {
        console.error("❌ Paystack Wallet not found. Run seeding script first.");
        process.exit(1);
    }

    // Ensure wallet has funds
    const initialBalance = Number(wallet.balance);
    if (initialBalance < 5000) {
        console.log("Funding Wallet for test...");
        await db.update(accounts)
            .set({ balance: (initialBalance + 10000).toString() })
            .where(eq(accounts.id, wallet.id));
        console.log("✅ Wallet Funded");
    }

    const startBalance = Number((await db.query.accounts.findFirst({ where: eq(accounts.id, wallet.id) }))?.balance);
    console.log(`Initial Wallet Balance: ₦${startBalance.toLocaleString()}`);

    // 3. Create Expense
    const expenseAmount = 2000;
    const [expense] = await db.insert(expenses).values({
        description: "Test Expense for Verification",
        amount: expenseAmount.toString(),
        status: "APPROVED", // Skip approval flow, start as APPROVED
        requesterId: admin.id,
        approverId: admin.id,
        sourceAccountId: wallet.id,
    }).returning();

    console.log(`✅ Created Expense: ${expense.description} (₦${expenseAmount})`);

    // 4. Create Beneficiary
    await db.insert(expenseBeneficiaries).values({
        expenseId: expense.id,
        name: "Test Beneficiary",
        bankName: "Titan Bank", // Triggers Mock Transfer & Skips Resolution
        bankCode: "000",
        accountNumber: "1234567890",
        amount: expenseAmount.toString(),
        status: "PENDING"
    });

    // 5. Generate OTP
    const otp = await OtpService.generateOtp(admin.email);
    console.log(`✅ Generated OTP: ${otp}`);

    // 6. Disburse
    console.log("🚀 Disbursing Funds...");
    try {
        await DisbursementService.disburseExpense(
            expense.id,
            wallet.id,
            admin.id,
            otp,
            "ONLINE",
            "PAYSTACK"
        );
        console.log("✅ Disbursement Successful!");
    } catch (error) {
        console.error("❌ Disbursement Failed:", error);
        process.exit(1);
    }

    // 7. Verify Balance
    const updatedWallet = await db.query.accounts.findFirst({
        where: eq(accounts.id, wallet.id)
    });

    const endBalance = Number(updatedWallet?.balance);
    console.log(`Final Wallet Balance: ₦${endBalance.toLocaleString()}`);

    if (startBalance - endBalance === expenseAmount) {
        console.log("✅ Balance Verification Passed!");
    } else {
        console.error(`❌ Balance Mismatch! Expected decrease of ${expenseAmount}, got ${startBalance - endBalance}`);
    }

    // 8. Verify Expense Status
    const updatedExpense = await db.query.expenses.findFirst({
        where: eq(expenses.id, expense.id)
    });

    if (updatedExpense?.status === "DISBURSED") {
        console.log("✅ Expense Status Verified: DISBURSED");
    } else {
        console.error(`❌ Expense Status Mismatch! Expected DISBURSED, got ${updatedExpense?.status}`);
    }

    process.exit(0);
}

verifyExpenseFlow().catch(console.error);
