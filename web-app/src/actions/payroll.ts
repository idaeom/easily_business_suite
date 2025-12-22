
"use server";

import { getDb } from "@/db";
import {
    employeeProfiles, payrollRuns, payrollItems,
    accountingConfig, ledgerEntries, transactions, accounts, expenses, expenseCategories
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ==========================================
// NIGERIAN PAYROLL ENGINE (SIMPLIFIED)
// ==========================================
// 2024 Personal Income Tax Act (PITA) Logic
function calculatePAYE(gross: number, type: "ANNUAL" | "MONTHLY" = "MONTHLY") {
    // 1. Consolidated Relief Allowance (CRA)
    // Higher of 200,000 or 1% of Gross + 20% of Gross
    // For manual correctness: CRA = 200k + 20% OR 1% + 20%
    // Let's use Standard: 200k + 20% of Gross Income (Annual)

    // Convert to Annual for reliable calc
    const annualGross = type === "MONTHLY" ? gross * 12 : gross;

    const craFixed = 200000;
    const craPercent = 0.20 * annualGross;
    // Note: The rule is actually Higher of (200k or 1% Gross) + 20% Gross
    // But for most salaries > 200k, it's 200k + 20%
    const relief = craFixed + craPercent;

    // Pension (Employee Share 8%) - Tax Exempt
    // Usually based on Basic + Housing + Transport
    // We assume Gross is B+H+T for simplicity unless structure differs.
    // Let's assume passed 'gross' is taxable base for now.

    const taxableIncome = Math.max(0, annualGross - relief);

    // Tax Bands (Annual)
    // 1st 300k @ 7%
    // Next 300k @ 11%
    // Next 500k @ 15%
    // Next 500k @ 19%
    // Next 1.6M @ 21%
    // Above 3.2M @ 24%

    let tax = 0;
    let remaining = taxableIncome;

    // Band 1
    const b1 = Math.min(remaining, 300000);
    tax += b1 * 0.07;
    remaining -= b1;

    // Band 2
    if (remaining > 0) {
        const b2 = Math.min(remaining, 300000);
        tax += b2 * 0.11;
        remaining -= b2;
    }

    // Band 3
    if (remaining > 0) {
        const b3 = Math.min(remaining, 500000);
        tax += b3 * 0.15;
        remaining -= b3;
    }

    // Band 4
    if (remaining > 0) {
        const b4 = Math.min(remaining, 500000);
        tax += b4 * 0.19;
        remaining -= b4;
    }

    // Band 5
    if (remaining > 0) {
        const b5 = Math.min(remaining, 1600000);
        tax += b5 * 0.21;
        remaining -= b5;
    }

    // Band 6
    if (remaining > 0) {
        tax += remaining * 0.24;
    }

    // Minimum Tax Rule: 1% of Gross if Tax < 1% Gross (Usually for very low income but high allowances)
    // skipping matching min tax for simplicity in MVP.

    return type === "MONTHLY" ? tax / 12 : tax;
}

export type PayrollPreviewItem = {
    userId: string;
    userName: string;
    basic: number;
    housing: number;
    transport: number;
    other: number;
    gross: number;
    pension: number; // 8%
    tax: number; // PAYE
    net: number;
};

export async function previewPayroll(month: number, year: number) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Fetch Active Employee Profiles
    const profiles = await db.query.employeeProfiles.findMany({
        with: { user: true }
    });

    const items: PayrollPreviewItem[] = profiles.map(em => {
        const basic = Number(em.basicSalary);
        const housing = Number(em.housingAllowance);
        const transport = Number(em.transportAllowance);
        const other = Number(em.otherAllowances);

        // BHT Base for Pension
        const bht = basic + housing + transport;

        const gross = bht + other;

        // Pension: 8% of BHT
        const pension = em.isPensionActive ? (bht * 0.08) : 0;
        // Add Voluntary
        const pensionTotal = pension + Number(em.pensionVoluntary);

        // For Tax Base: Gross - (Pension + Other Exemptions)
        // Note: Pension is tax deductible
        // We pass the "Effective Gross" for tax calculation or handle deduction inside?
        // PAYE algo above uses "Gross" and deduces Relief. Relief doesn't explicitly mention Pension deduction.
        // Actually, Pension is deducted BEFORE Relief calculation or FROM Gross before Tax Table?
        // Standard: Taxable Income = Gross - Returns(Pension, NHF) - CRA

        // Let's adjust helper. 
        // We'll calculate PAYE on (Gross - Pension).

        const taxableGross = gross - pensionTotal;
        const tax = calculatePAYE(taxableGross, "MONTHLY");

        const net = gross - pensionTotal - tax; // Add other deductions later

        return {
            userId: em.userId,
            userName: em.user.name || "Unknown",
            basic,
            housing,
            transport,
            other,
            gross,
            pension: Number(pensionTotal.toFixed(2)),
            tax: Number(tax.toFixed(2)),
            net: Number(net.toFixed(2))
        };
    });

    const totalCost = items.reduce((sum, i) => sum + i.gross, 0); // Employer Cost also includes Employer Pension (10%)?
    // For now, tracking Employee Pay.

    return { items, totalCost };
}

export async function runPayroll(month: number, year: number) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // 1. Check if run exists
    const existing = await db.query.payrollRuns.findFirst({
        where: and(eq(payrollRuns.month, month), eq(payrollRuns.year, year))
    });

    if (existing) throw new Error(`Payroll for ${month}/${year} already exists.`);

    // 2. Calculate
    const { items, totalCost } = await previewPayroll(month, year);

    // 3. Create Expense Record (For Visibility)
    // Ensure Category Exists
    let salaryCategory = await db.query.expenseCategories.findFirst({
        where: eq(expenseCategories.name, "Salaries & Wages")
    });

    if (!salaryCategory) {
        const [newCat] = await db.insert(expenseCategories).values({
            name: "Salaries & Wages",
            type: "OPERATING"
        }).returning();
        salaryCategory = newCat;
    }

    const [expense] = await db.insert(expenses).values({
        description: `Payroll Run: ${month}/${year}`,
        amount: totalCost.toString(),
        status: "APPROVED",
        category: salaryCategory.id,
        expenseAccountId: (await db.query.accounts.findFirst({ where: eq(accounts.code, "6000") }))?.id, // Link to GL Account 6000
        sourceAccountId: null, // Not paid yet (Payable)
        requesterId: user.id,
        approverId: user.id
    }).returning();

    // 4. Create Run linked to Expense
    const [run] = await db.insert(payrollRuns).values({
        month,
        year,
        totalAmount: totalCost.toString(),
        status: "APPROVED", // Auto-approve for now
        certifierId: user.id,
        approverId: user.id,
        expenseId: expense.id
    }).returning();

    // 5. Create Items (Payslips)
    if (items.length > 0) {
        await db.insert(payrollItems).values(
            items.map(i => ({
                payrollRunId: run.id,
                userId: i.userId,
                grossPay: i.gross.toString(),
                netPay: i.net.toString(),
                breakdown: {
                    basic: i.basic,
                    housing: i.housing,
                    transport: i.transport,
                    tax: i.tax,
                    pension: i.pension,
                    otherDeductions: 0,
                    bonuses: i.other
                }
            }))
        );
    }


    // 5. GL POSTING
    // ===================================
    const txId = crypto.randomUUID();
    const description = `Payroll Run: ${month}/${year}`;

    await db.insert(transactions).values({
        id: txId,
        date: new Date(),
        description,
        status: "POSTED",
        metadata: { type: "PAYROLL", payrollRunId: run.id }
    });

    // Aggregates
    const totalBasic = items.reduce((s, i) => s + i.basic + i.housing + i.transport + i.other, 0); // Total Salaries Expense
    const totalTax = items.reduce((s, i) => s + i.tax, 0); // PAYE Payable
    const totalPension = items.reduce((s, i) => s + i.pension, 0); // Pension Payable (Employee Share Only for now)
    const totalNet = items.reduce((s, i) => s + i.net, 0); // Net Payable to Staff

    // A. DEBIT: Salaries Expense (6000)
    const salaryAcc = await db.query.accounts.findFirst({ where: eq(accounts.code, "6000") });
    if (salaryAcc) {
        await db.insert(ledgerEntries).values({
            transactionId: txId,
            accountId: salaryAcc.id,
            amount: totalBasic.toString(),
            direction: "DEBIT",
            description: "Staff Salaries & Allowances"
        });
        await db.execute(sql`UPDATE "Account" SET balance = balance + ${totalBasic} WHERE id = ${salaryAcc.id}`);
    }

    // B. CREDIT: PAYE Payable (2220)
    const taxAcc = await db.query.accounts.findFirst({ where: eq(accounts.code, "2220") });
    if (taxAcc && totalTax > 0) {
        await db.insert(ledgerEntries).values({
            transactionId: txId,
            accountId: taxAcc.id,
            amount: totalTax.toString(),
            direction: "CREDIT",
            description: "PAYE Deductions"
        });
        await db.execute(sql`UPDATE "Account" SET balance = balance + ${totalTax} WHERE id = ${taxAcc.id}`);
    }

    // C. CREDIT: Pension Payaable (Need Account? or use WHT/Other?)
    // Let's use "Payroll Payable" (2400) for Net, and we need a Pension Payable.
    // Standard COA didn't have Pension Payable? 
    // We can use 2400 for total liability or split. 
    // Let's put Pension into 2400 for now or create one if missing.
    // Actually, let's just dump Pension into 'Other Liabilities' or specific if exists.
    // We'll put it in 2400 (Payroll Payable) as a separate line item for distinct tracking.
    // ideally should be "Pension Payable".

    // D. CREDIT: Payroll Payable (2400) - Net Pay
    const netPayAcc = await db.query.accounts.findFirst({ where: eq(accounts.code, "2400") });
    if (netPayAcc) {
        await db.insert(ledgerEntries).values({
            transactionId: txId,
            accountId: netPayAcc.id,
            amount: totalNet.toString(),
            direction: "CREDIT",
            description: "Net Salaries Payable"
        });
        await db.execute(sql`UPDATE "Account" SET balance = balance + ${totalNet} WHERE id = ${netPayAcc.id}`);

        // Add Pension here too if no specific account
        if (totalPension > 0) {
            await db.insert(ledgerEntries).values({
                transactionId: txId,
                accountId: netPayAcc.id,
                amount: totalPension.toString(),
                direction: "CREDIT",
                description: "Pension Deductions Payable"
            });
            await db.execute(sql`UPDATE "Account" SET balance = balance + ${totalPension} WHERE id = ${netPayAcc.id}`);
        }
    }

    if (process.env.IS_SCRIPT !== "true") {
        try {
            revalidatePath("/dashboard/hr/payroll");
        } catch (e) {
            // Ignore
        }
    }
    return { success: true, runId: run.id };
}
