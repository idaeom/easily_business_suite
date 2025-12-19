import { getDb } from "@/db";
import { expenses, expenseBeneficiaries, users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { OtpService } from "./otp";
import { AuditService } from "./audit";
import { PaystackService } from "./paystack";
import { FinanceService } from "./finance";
import { TestConfig } from "./test-config";
import { getAppMode } from "@/actions/app-mode";

export class DisbursementService {
    /**
     * Executes the payment.
     * 1. Verifies OTP
     * 2. Checks Balance & Approvals
     * 3. Calls Paystack Transfer API
     * 4. Updates Ledger (Double Entry)
     */
    static async disburseExpense(
        expenseId: string,
        sourceAccountId: string,
        userId: string,
        otp: string,
        mode: "ONLINE" | "MANUAL" = "ONLINE",
        provider: "PAYSTACK" | "FLUTTERWAVE" | "SQUADCO" = "PAYSTACK"
    ) {
        console.log("DEBUG: Entering disburseExpense");
        // Fetch App Mode
        const appMode = await getAppMode();
        const isTestMode = appMode === "TEST";
        const db = await getDb();
        console.log("DEBUG: DB Connection obtained");

        // 1. Verify User & OTP First (Fail Fast)
        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (!user || !user.email) throw new Error("User not found");

        // Permission Check
        const hasPermission = user.role === "ADMIN" || (user.permissions as string[])?.includes("EXPENSE_PAY");
        if (!hasPermission) {
            throw new Error("Unauthorized: You do not have permission to disburse funds.");
        }

        const isOtpValid = await OtpService.verifyOtp(user.email, otp);
        if (!isOtpValid) throw new Error("Invalid or Expired OTP");

        // 2. PHASE 1: LOCK FUNDS (The "Intent")
        // We start a SHORT transaction just to mark it as processing.
        await db.transaction(async (tx) => {
            const expense = await tx.query.expenses.findFirst({
                where: eq(expenses.id, expenseId),
            });

            if (!expense) throw new Error("Expense not found");

            // Double-spend check
            if (expense.status !== "APPROVED" && expense.status !== "PARTIALLY_PAID" && expense.status !== "PAYMENT_FAILED") {
                throw new Error(`Expense is ${expense.status}, must be APPROVED, PARTIALLY_PAID, or PAYMENT_FAILED.`);
            }

            // Validate Source Account
            const account = await tx.query.accounts.findFirst({ where: eq(accounts.id, sourceAccountId) });
            if (!account) throw new Error("Invalid Source Account");
            const sourceAccount = await tx.query.accounts.findFirst({ where: eq(accounts.id, sourceAccountId) });
            if (!sourceAccount) throw new Error("Invalid Source Account");

            // Check Balance (Simple check, FinanceService handles strict check)
            if (Number(sourceAccount.balance) < Number(expense.amount)) {
                throw new Error(`Insufficient Funds in Source Account (Local Ledger: ₦${Number(sourceAccount.balance).toLocaleString()}). Please fund the wallet via Finance Dashboard.`);
            }

            // Extract Credentials if available
            const credentials = sourceAccount.credentials as { publicKey?: string; secretKey?: string } | null;
            const secretKey = credentials?.secretKey;

            // Check Provider Balance (Real-world check)
            // Use TestConfig to determine if we should call Real API
            const shouldCallRealApi = TestConfig.shouldCallRealApi(sourceAccount.bankName);

            if (mode === "ONLINE" && shouldCallRealApi) {
                if (provider === "PAYSTACK") {
                    const paystackBalance = await PaystackService.getBalance(secretKey);
                    // Paystack balance is in kobo, expense amount is in Naira
                    if (paystackBalance < Number(expense.amount) * 100) {
                        throw new Error(`Insufficient Funds in Paystack Wallet. Available: ₦${(paystackBalance / 100).toLocaleString()}`);
                    }
                } else if (provider === "SQUADCO") {
                    const { SquadcoService } = await import("@/lib/squadco");
                    const squadBalance = await SquadcoService.getBalance(secretKey || "");
                    // Squadco balance is in kobo
                    if (squadBalance < Number(expense.amount) * 100) {
                        throw new Error(`Insufficient Funds in Squadco Wallet. Available: ₦${(squadBalance / 100).toLocaleString()}`);
                    }
                } else if (provider === "FLUTTERWAVE") {
                    // TODO: Implement Flutterwave Balance Check
                    throw new Error("Flutterwave support coming soon.");
                }
            }

            // Update status to prevent anyone else from clicking "Disburse"
            await tx.update(expenses)
                .set({
                    status: "PROCESSING_PAYMENT" as any,
                    sourceAccountId
                })
                .where(eq(expenses.id, expenseId));
        });

        // 3. PHASE 2: CALL THE BANK (With Partial Failure Protection)
        const expense = await db.query.expenses.findFirst({
            where: eq(expenses.id, expenseId),
            with: { beneficiaries: true }
        });

        if (!expense) throw new Error("Expense not found (Phase 2)");

        // Re-fetch source account to get credentials outside the transaction
        const sourceAccount = await db.query.accounts.findFirst({ where: eq(accounts.id, sourceAccountId) });
        if (!sourceAccount) throw new Error("Invalid Source Account (Phase 2)");
        const credentials = sourceAccount.credentials as { publicKey?: string; secretKey?: string } | null;
        const secretKey = credentials?.secretKey;

        let transferReference = "";
        let successCount = 0;
        let failCount = 0;

        const shouldCallRealApiPhase2 = TestConfig.shouldCallRealApi(sourceAccount.bankName);

        if (mode === "ONLINE") {
            // MOCK TRANSFER for Test Accounts (where Real API is NOT required)
            if (!shouldCallRealApiPhase2) {
                console.log("Simulating Transfer for Test Account...");
                for (const ben of expense.beneficiaries) {
                    if (ben.status === 'PAID') {
                        successCount++;
                        continue;
                    }
                    // Simulate success
                    const ref = `TEST_TRF_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                    await db.update(expenseBeneficiaries)
                        .set({ status: 'PAID', transferCode: ref })
                        .where(eq(expenseBeneficiaries.id, ben.id));

                    if (ref) transferReference = ref;
                    successCount++;
                }
            } else {
                try {
                    if (provider === "PAYSTACK") {
                        for (const ben of expense.beneficiaries) {
                            // CRITICAL CHECK: Skip if already paid (Idempotency)
                            if (ben.status === 'PAID') {
                                successCount++;
                                continue;
                            }

                            try {
                                // STEP 1: Verify Account Number
                                // Use TestConfig to determine if resolution should be skipped
                                let resolvedAccount: { account_name: string } | null = null;

                                if (!TestConfig.shouldSkipResolution(ben.bankName, isTestMode)) {
                                    resolvedAccount = await PaystackService.resolveAccount(ben.accountNumber, ben.bankCode, secretKey);
                                    if (!resolvedAccount) {
                                        throw new Error(`Invalid Account: Could not resolve account ${ben.accountNumber} for beneficiary ${ben.name}`);
                                    }
                                } else {
                                    // Use stored name for test beneficiaries
                                    resolvedAccount = { account_name: ben.name };
                                }

                                const ref = await PaystackService.initiateTransfer({
                                    amount: Number(ben.amount),
                                    recipientName: resolvedAccount.account_name,
                                    // Use TestConfig to get forced bank code if needed
                                    bankCode: TestConfig.isTestBeneficiary(ben.bankName, isTestMode) ? TestConfig.getTestBankCode() : ben.bankCode,
                                    accountNumber: ben.accountNumber,
                                    reason: expense.description
                                }, undefined, undefined, secretKey);

                                // Mark THIS beneficiary as PAID immediately
                                await db.update(expenseBeneficiaries)
                                    .set({ status: 'PAID', transferCode: ref })
                                    .where(eq(expenseBeneficiaries.id, ben.id));

                                if (ref) transferReference = ref;
                                successCount++;
                            } catch (err) {
                                console.error(`Failed to pay beneficiary ${ben.name}:`, err);
                                failCount++;
                            }
                        }
                    } else if (provider === "SQUADCO") {
                        const { SquadcoService } = await import("@/lib/squadco");
                        for (const ben of expense.beneficiaries) {
                            if (ben.status === 'PAID') {
                                successCount++;
                                continue;
                            }

                            try {
                                // Verify Account
                                const resolvedAccount = await SquadcoService.resolveAccount(ben.accountNumber, ben.bankCode, secretKey || "");
                                if (!resolvedAccount) {
                                    throw new Error(`Invalid Account: Could not resolve account ${ben.accountNumber} for beneficiary ${ben.name}`);
                                }

                                const ref = await SquadcoService.initiateTransfer({
                                    amount: Number(ben.amount),
                                    recipientName: resolvedAccount.account_name,
                                    bankCode: ben.bankCode,
                                    accountNumber: ben.accountNumber,
                                    reason: expense.description
                                }, secretKey || "");

                                await db.update(expenseBeneficiaries)
                                    .set({ status: 'PAID', transferCode: ref })
                                    .where(eq(expenseBeneficiaries.id, ben.id));

                                if (ref) transferReference = ref;
                                successCount++;
                            } catch (err) {
                                console.error(`Failed to pay beneficiary ${ben.name}:`, err);
                                failCount++;
                            }
                        }
                    } else {
                        throw new Error(`Provider ${provider} not supported yet.`);
                    }
                } catch (error) {
                    console.error("Disbursement Error:", error);
                    // If the entire provider block fails (e.g. import error), we count all remaining as failed
                    failCount += expense.beneficiaries.length - successCount - failCount;
                }
            }
        }

        // 4. HANDLING RESULTS
        if (failCount > 0) {
            if (successCount === 0) {
                // TOTAL FAILURE
                await db.update(expenses)
                    .set({ status: "PAYMENT_FAILED" as any })
                    .where(eq(expenses.id, expenseId));
                throw new Error("Payment Failed. No beneficiaries were paid.");
            } else {
                // PARTIAL SUCCESS
                await db.update(expenses)
                    .set({ status: "PARTIALLY_PAID" as any })
                    .where(eq(expenses.id, expenseId));
                throw new Error(`Partial Payment: ${successCount} paid, ${failCount} failed. Please retry.`);
            }
        }

        // 5. PHASE 3: RECORD SUCCESS (The Ledger)
        // Money moved successfully. Now we record it.
        return db.transaction(async (tx) => {
            // Find or Create General Expense Account
            // Find Expense Account (Use selected category or fallback to General)
            let expenseAccount: { id: string } | undefined;

            if (expense.expenseAccountId) {
                expenseAccount = { id: expense.expenseAccountId };
            } else {
                // Fallback to General Expenses
                const generalExpense = await tx.query.accounts.findFirst({
                    where: eq(accounts.code, "EXPENSE_GENERAL")
                });

                if (generalExpense) {
                    expenseAccount = generalExpense;
                } else {
                    // Create General Expense Account if missing
                    const [newAccount] = await tx.insert(accounts).values({
                        name: "General Expenses",
                        code: "EXPENSE_GENERAL",
                        type: "EXPENSE",
                        description: "General expense account for disbursements",
                        currency: "NGN",
                        balance: "0",
                    }).returning();
                    expenseAccount = newAccount;
                }
            }

            if (!expenseAccount) {
                throw new Error("Failed to determine Expense Account for ledger entry.");
            }

            // Update Ledger using FinanceService (Standard Accounting Logic)
            // We pass 'tx' so it participates in this transaction
            await FinanceService.createTransaction({
                description: `Disbursement: ${expense.description} (Ref: ${transferReference})`,
                date: new Date(),
                entries: [
                    {
                        accountId: sourceAccountId, // The Bank
                        amount: -Number(expense.amount), // Credit (Negative) -> Decreases Asset
                    },
                    {
                        accountId: expenseAccount.id, // Expense Account
                        amount: Number(expense.amount), // Debit (Positive) -> Increases Expense
                    }
                ]
            }, tx);

            // Final Status
            await tx.update(expenses)
                .set({
                    status: "DISBURSED",
                    updatedAt: new Date()
                })
                .where(eq(expenses.id, expenseId));

            // Audit Log
            await AuditService.log(
                userId,
                "DISBURSE_EXPENSE",
                "Expense",
                expenseId,
                {
                    amount: expense.amount,
                    method: mode,
                    bank: sourceAccountId // Should be bank name ideally
                },
                tx
            );

            return { success: true };
        });
    }
}
