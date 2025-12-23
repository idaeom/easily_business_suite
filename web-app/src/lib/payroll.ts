import { getDb } from "@/db";
import { employeeProfiles, payrollRuns, payrollItems, expenses, expenseBeneficiaries, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ExpenseService } from "./expenses";
import { HrService } from "./hr";
import { PayrollEngine } from "./payroll-engine";

export class PayrollService {
    // Statutory Constants (Simplified for Nigeria Context)
    private static PENSION_RATE = 0.08; // 8% Employee Contribution
    private static TAX_RATE = 0.10; // Flat 10% for simplicity (Needs Progressive Tax Engine usually)

    static async createPayrollRun(month: number, year: number, adminUserId: string) {
        const db = await getDb();

        // Check if run exists
        const existing = await db.query.payrollRuns.findFirst({
            where: and(
                eq(payrollRuns.month, month),
                eq(payrollRuns.year, year)
            )
        });

        if (existing) {
            throw new Error(`Payroll run for ${month}/${year} already exists.`);
        }

        // Get Valid Employees with tax settings
        const employees = await HrService.getAllEmployees();
        const validEmployees = employees.filter(e => e.employeeProfile);

        if (validEmployees.length === 0) {
            throw new Error("No employees with active HR profiles found.");
        }

        // Create Run Shell with snapshot config
        const [run] = await db.insert(payrollRuns).values({
            month,
            year,
            status: "DRAFT",
            totalAmount: "0",
            config: {
                pensionRate: PayrollEngine.PENSION_RATE,
                nhfRate: PayrollEngine.NHF_RATE,
                nhisRate: 0, // Default
                taxBands: "Finance Act 2020"
            }
        }).returning();

        let totalRunAmount = 0;

        // Process Items using Engine
        for (const emp of validEmployees) {
            const profile = emp.employeeProfile!;

            const input = {
                earnings: {
                    basic: Number(profile.basicSalary),
                    housing: Number(profile.housingAllowance),
                    transport: Number(profile.transportAllowance),
                    others: Number(profile.otherAllowances),
                    bonuses: 0 // Initial draft has 0 bonuses
                },
                settings: {
                    isPensionActive: profile.isPensionActive ?? true,
                    pensionVoluntary: Number(profile.pensionVoluntary || 0),
                    isNhfActive: profile.isNhfActive ?? false,
                    isNhisActive: profile.isNhisActive ?? false,
                    lifeAssurance: Number(profile.lifeAssurance || 0),
                    totalDays: 22, // Standard working days
                    absentDays: 0, // Initial draft assumption
                    otherDeductions: 0
                }
            };

            const calculation = PayrollEngine.calculate(input);

            await db.insert(payrollItems).values({
                payrollRunId: run.id,
                userId: emp.id,
                grossPay: calculation.gross.toString(),
                netPay: calculation.netPay.toString(),
                breakdown: { ...calculation, input } as any // Store Input for later adjustments
            });

            totalRunAmount += calculation.netPay;
        }

        // Update Total
        await db.update(payrollRuns)
            .set({ totalAmount: totalRunAmount.toString() })
            .where(eq(payrollRuns.id, run.id));

        return run;
    }

    static async submitForCertification(runId: string) {
        const db = await getDb();
        const run = await db.query.payrollRuns.findFirst({ where: eq(payrollRuns.id, runId) });
        if (!run) throw new Error("Run not found");
        if (run.status !== "DRAFT") throw new Error("Run must be in DRAFT");

        await db.update(payrollRuns).set({ status: "PENDING_CERTIFICATION" }).where(eq(payrollRuns.id, runId));
    }

    static async certifyPayrollRun(runId: string, certifierId: string) {
        const db = await getDb();
        const run = await db.query.payrollRuns.findFirst({ where: eq(payrollRuns.id, runId) });
        if (!run) throw new Error("Run not found");
        // Allow transition from DRAFT directly if certifier is skipping (unlikely) or strict PENDING_CERTIFICATION
        if (run.status !== "PENDING_CERTIFICATION") throw new Error("Run must be PENDING_CERTIFICATION");

        await db.update(payrollRuns)
            .set({ status: "PENDING_APPROVAL", certifierId })
            .where(eq(payrollRuns.id, runId));
    }

    static async rejectPayrollRun(runId: string, rejectorId: string, reason?: string) {
        const db = await getDb();
        // Revert to DRAFT for corrections
        await db.update(payrollRuns)
            .set({ status: "DRAFT" })
            .where(eq(payrollRuns.id, runId));

        // Optionally log rejection in audit/comments via actions
    }

    static async approvePayrollRun(runId: string, adminUserId: string) {
        const db = await getDb();

        // 1. Fetch Run & Items
        const run = await db.query.payrollRuns.findFirst({
            where: eq(payrollRuns.id, runId),
            with: { items: { with: { user: { with: { employeeProfile: true } } } } }
        });

        if (!run) throw new Error("Payroll run not found");
        if (run.status !== "PENDING_APPROVAL") throw new Error("Payroll run must be PENDING_APPROVAL");
        // Note: Strict check. Previously DRAFT.

        // 2. Prepare Beneficiaries Buckets
        const salaryBeneficiaries: any[] = [];
        const pensionBeneficiaries: any[] = [];

        let totalNetSalary = 0;
        let totalTax = 0;
        let totalPension = 0; // Combined (Employee + Employer)

        for (const item of run.items) {
            const profile = item.user.employeeProfile;
            const breakdown = item.breakdown as any;

            // A. Net Salary
            const net = Number(item.netPay);
            if (net > 0) {
                salaryBeneficiaries.push({
                    name: item.user.name || "Employee",
                    bankName: profile?.bankName || "Unknown Bank",
                    bankCode: "000",
                    accountNumber: profile?.accountNumber || "0000000000",
                    amount: net,
                    status: "PENDING"
                });
                totalNetSalary += net;
            }

            // B. Tax Processing (Aggregated, but typically we just need the total for FIRS)
            totalTax += (breakdown.tax?.paye || 0);

            // C. Pension Processing
            const empDed = breakdown.deductions?.pension || 0;
            const employerCont = breakdown.employerContribution?.pension || 0;
            const pensionSum = empDed + employerCont;

            if (pensionSum > 0) {
                pensionBeneficiaries.push({
                    name: `${item.user.name} (${profile?.pfaName || 'Unknown PFA'})`, // Format: John Doe (Leadway)
                    bankName: profile?.pfaName || "Pension Fund Administrator",
                    bankCode: profile?.pfaCode || "000",
                    accountNumber: profile?.pensionId || "RSA-000000", // RSA Number maps to Account Number
                    amount: pensionSum,
                    status: "PENDING"
                });
                totalPension += pensionSum;
            }
        }

        const expenseIds: any = {};

        // 3. Create Expenses

        // Expense 1: Salaries (Net)
        // Linked to "Payroll Payable" (2400) because we successfully Accrued it above.
        // Disbursement will Debit 2400, Credit Bank.
        const payableAccId = await this.getAccountId(db, "2400");
        const taxAccId = await this.getAccountId(db, "2220");

        if (totalNetSalary > 0) {
            const salaryExp = await ExpenseService.createExpense({
                description: `Payroll: Salaries - ${run.month}/${run.year}`,
                amount: totalNetSalary,
                requesterId: adminUserId,
                category: "Salaries & Wages",
                expenseAccountId: payableAccId, // IMPORTANT: Pay from Liability
                incurredAt: new Date(),
            });
            await this.addBeneficiaries(salaryExp.id, salaryBeneficiaries, db);
            await ExpenseService.approveExpense(salaryExp.id, adminUserId);
            expenseIds.salaryExpenseId = salaryExp.id;
        }

        // Expense 2: Tax (PAYE)
        if (totalTax > 0) {
            const taxExp = await ExpenseService.createExpense({
                description: `Payroll: PAYE Tax - ${run.month}/${run.year}`,
                amount: totalTax,
                requesterId: adminUserId,
                category: "Taxes",
                expenseAccountId: taxAccId, // Pay from PAYE Payable
                incurredAt: new Date(),
            });
            // Single Beneficiary: FIRS
            await this.addBeneficiaries(taxExp.id, [{
                name: "Federal Inland Revenue Service",
                bankName: "CBN / Remita",
                bankCode: "000",
                accountNumber: "TAX-REMITTANCE-ACC",
                amount: totalTax,
                status: "PENDING"
            }], db);
            await ExpenseService.approveExpense(taxExp.id, adminUserId);
            expenseIds.taxExpenseId = taxExp.id;
        }

        // Expense 3: Pension
        if (totalPension > 0) {
            const pensionExp = await ExpenseService.createExpense({
                description: `Payroll: Pension Remittance - ${run.month}/${run.year}`,
                amount: totalPension,
                requesterId: adminUserId,
                category: "Pension",
                expenseAccountId: payableAccId, // Pay from Payroll Payable (merged for now)
                incurredAt: new Date(),
            });
            await this.addBeneficiaries(pensionExp.id, pensionBeneficiaries, db);
            await ExpenseService.approveExpense(pensionExp.id, adminUserId);
            expenseIds.pensionExpenseId = pensionExp.id;
        }

        // 4. Update Run
        await db.update(payrollRuns)
            .set({
                status: "APPROVED",
                expenseId: expenseIds.salaryExpenseId, // Link main salary expense for easy access
                expenseMeta: expenseIds // Store all generated IDs
            })
            .where(eq(payrollRuns.id, runId));

        // 5. GL POSTING (ACCRUAL)
        const { FinanceService } = await import("@/lib/finance");
        const salaryAccId = await this.getAccountId(db, "6000"); // Salaries Expense
        const payeAccId = await this.getAccountId(db, "2220"); // PAYE Payable
        const payrollPayableId = await this.getAccountId(db, "2400"); // Net Pay Payable (Also used for Pension/Other for now)

        // Ensure accounts exist (basic check)
        if (salaryAccId && payeAccId && payrollPayableId) {
            // A. Debit Salaries (Total Gross)
            // Wait, Salaries Expense = Basic + Housing + Transport + Others.
            // Employer Pension is separate Expense usually? Or included in Staff Costs?
            // Let's bundle Employer Pension into Salaries Expense (or 6000-series sub-account) for simplicity.

            const totalGross = run.items.reduce((sum, item) => sum + Number(item.grossPay), 0);
            const totalEmployerPension = run.items.reduce((sum, item) => sum + ((item.breakdown as any).employerContribution?.pension || 0), 0);
            const totalStaffCost = totalGross + totalEmployerPension;

            const txId = crypto.randomUUID();
            // Create GL Transaction
            await FinanceService.createTransaction({
                date: new Date(),
                description: `Payroll Accrual: ${run.month}/${run.year}`,
                metadata: { type: "PAYROLL", runId },
                entries: [
                    // DEBITS (Expenses) - Positive
                    {
                        accountId: salaryAccId,
                        amount: totalStaffCost, // Gross + Employer Pension
                        description: `Staff Salaries & Employer Pension`
                    },
                    // CREDITS (Liabilities) - Negative
                    // 1. PAYE
                    ...(totalTax > 0 ? [{
                        accountId: payeAccId,
                        amount: -totalTax,
                        description: "PAYE Tax Payable"
                    }] : []),
                    // 2. Net Pay (Payroll Payable)
                    ...(totalNetSalary > 0 ? [{
                        accountId: payrollPayableId,
                        amount: -totalNetSalary,
                        description: "Net Salaries Payable"
                    }] : []),
                    // 3. Pension (Payroll Payable or Specific)
                    ...(totalPension > 0 ? [{
                        accountId: payrollPayableId, // Using 2400 for Pension too as we didn't split it in COA yet
                        amount: -totalPension, // Employee + Employer
                        description: "Pension Contribution Payable"
                    }] : [])
                ] as any
            });
        }

        return { run, expenseIds };
    }

    private static async addBeneficiaries(expenseId: string, beneficiaries: any[], db: any) {
        const { expenseBeneficiaries } = await import("@/db/schema");
        if (beneficiaries.length === 0) return;

        for (const b of beneficiaries) {
            await db.insert(expenseBeneficiaries).values({
                expenseId: expenseId,
                name: b.name,
                bankName: b.bankName,
                bankCode: b.bankCode,
                accountNumber: b.accountNumber,
                amount: b.amount.toString(),
                status: "PENDING"
            });
        }
    }

    // Helper to get Account ID by code
    private static async getAccountId(db: any, code: string) {
        const { accounts } = await import("@/db/schema");
        const account = await db.query.accounts.findFirst({ where: eq(accounts.code, code) });
        return account?.id;
    }
}
