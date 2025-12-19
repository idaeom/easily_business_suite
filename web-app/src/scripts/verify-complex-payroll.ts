
import { PayrollEngine, PayrollInput } from "../lib/payroll-engine";
import { formatCurrency } from "../lib/utils";

const rule2020 = {
    type: "progressive",
    cra: { enabled: true, consolidatedParams: { min: 200000, percent: 0.01 }, percentGross: 0.20 },
    bands: [
        { limit: 300000, rate: 0.07 },
        { limit: 300000, rate: 0.11 },
        { limit: 500000, rate: 0.15 },
        { limit: 500000, rate: 0.19 },
        { limit: 1600000, rate: 0.21 },
        { limit: Infinity, rate: 0.24 }
    ],
    exemptions: { threshold: 360000 }
};

const input: PayrollInput = {
    earnings: {
        basic: 100000,
        housing: 50000,
        transport: 20000,
        others: 10000,
        bonuses: 50000 // +Variable
    },
    settings: {
        isPensionActive: true,
        pensionVoluntary: 5000, // +Voluntary
        isNhfActive: true,
        isNhisActive: false,
        lifeAssurance: 20000, // +Relief
        totalDays: 20,
        absentDays: 1, // -Attendance (95%)
        otherDeductions: 10000 // +Deduction
    }
};

async function main() {
    console.log("Verifying Complex Payroll Scenario (All Adjustments Active)...");
    console.log("Scenario:");
    console.log("- Base Gross: 180k (Basic 100k, Housing 50k, Trans 20k, Other 10k)");
    console.log("- Attendance: 1/20 Days Absent (95% Factor)");
    console.log("- Bonus: +50k");
    console.log("- Pension: 8% + 5k Voluntary");
    console.log("- Deductions: NHF (2.5%) + 10k Other");
    console.log("- Reliefs: Life Assurance 20k");

    const res = PayrollEngine.calculate(input, rule2020);

    console.log("\n--- Results ---");
    console.log(`Gross Pay:      ${formatCurrency(res.gross)}`);
    console.log(`Taxable Income: ${formatCurrency(res.taxableIncome)}`);
    console.log(`PAYE Tax:       ${formatCurrency(res.tax.paye)}`);
    console.log(`Pension:        ${formatCurrency(res.deductions.pension)}`);
    console.log(`NHF:            ${formatCurrency(res.deductions.nhf)}`);
    console.log(`Other Ded:      ${formatCurrency(res.deductions.other)}`);
    console.log(`Net Pay:        ${formatCurrency(res.netPay)}`);

    // Expected Values (Calcuated Manually)
    // 1. Prorated Fixed: 0.95 * 180k = 171k. + Bonus 50k = 221k Gross.
    const expectedGross = 221000;

    // 2. Pension: 8% of (95k+47.5k+19k = 161.5k) = 12,920. + 5k = 17,920.
    const expectedPension = 17920;

    // 3. NHF: 2.5% of 95k = 2,375.
    const expectedNhf = 2375;

    // 4. Tax Logic (Annualized) - STRICT PITA Definition
    // Annual Gross: 2,652,000
    // Exemptions (Pension/NHF/Life): 483,540
    // Gross Income for CRA (Gross - Exempts): 2,168,460
    // CRA: 200k + (20% of 2,168,460) = 200,000 + 433,692 = 633,692
    // Total Reliefs: 483,540 + 633,692 = 1,117,232
    // Taxable Income: 2,652,000 - 1,117,232 = 1,534,768 (Monthly ~127,897)
    // Tax Calculation:
    // 300k @ 7% = 21,000
    // 300k @ 11% = 33,000
    // 500k @ 15% = 75,000
    // Remainder (434,768) @ 19% = 82,605.92
    // Total Annual Tax: 211,605.92
    // Monthly Tax: 17,633.826
    const expectedTaxLow = 17633.80;
    const expectedTaxHigh = 17633.90;

    // 5. Net Pay
    // 221,000 - (17,920 + 2,375 + 17,633.83 + 10,000) = 173,071.17
    const expectedNetLow = 173071.10;
    const expectedNetHigh = 173071.25;

    console.log("\n--- Verification ---");

    let passed = true;

    if (res.gross !== expectedGross) {
        console.error(`❌ Gross Mismatch: Expected ${expectedGross}, Got ${res.gross}`);
        passed = false;
    } else console.log("✅ Gross Pay: Correct");

    if (res.deductions.pension !== expectedPension) {
        console.error(`❌ Pension Mismatch: Expected ${expectedPension}, Got ${res.deductions.pension}`);
        passed = false;
    } else console.log("✅ Pension: Correct");

    if (res.deductions.nhf !== expectedNhf) {
        console.error(`❌ NHF Mismatch: Expected ${expectedNhf}, Got ${res.deductions.nhf}`);
        passed = false;
    } else console.log("✅ NHF: Correct");

    if (res.tax.paye < expectedTaxLow || res.tax.paye > expectedTaxHigh) {
        console.error(`❌ Tax Mismatch: Expected ~${expectedTaxLow}, Got ${res.tax.paye}`);
        passed = false;
    } else console.log("✅ Tax: Correct");

    if (res.netPay < expectedNetLow || res.netPay > expectedNetHigh) {
        console.error(`❌ Net Pay Mismatch: Expected ~${expectedNetLow}, Got ${res.netPay}`);
        passed = false;
    } else console.log("✅ Net Pay: Correct");

    if (passed) {
        console.log("\nscenarios verified successfully.");
    } else {
        console.error("\nfailed verification.");
        process.exit(1);
    }
}
main();
