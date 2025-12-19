
import { PayrollEngine } from "../lib/payroll-engine";

function test(salary: number, name: string) {
    console.log(`\nTesting for: ${name} (Monthly Basic: ${salary})`);

    // Assume Salary is Basic, split some into Housing/Transport 
    // 50% Basic, 30% Housing, 20% Transport
    const basic = salary * 0.5;
    const housing = salary * 0.3;
    const transport = salary * 0.2;

    const input = {
        earnings: {
            basic,
            housing,
            transport,
            others: 0,
            bonuses: 0
        },
        settings: {
            isPensionActive: true,
            pensionVoluntary: 0,
            isNhfActive: false, // Turn off for simplicity or test specifically
            isNhisActive: false,
            lifeAssurance: 0,
            totalDays: 22,
            absentDays: 0,
            otherDeductions: 0
        }
    };

    const result = PayrollEngine.calculate(input);

    console.log(`Gross: ${result.gross.toLocaleString()}`);
    console.log(`CRA (Monthly): ${result.allowances.consolidatedRelief.toLocaleString()}`);
    console.log(`Pension (8%): ${result.deductions.pension.toLocaleString()}`);
    console.log(`Taxable Income (Monthly): ${result.taxableIncome.toLocaleString()}`);
    console.log(`PAYE Tax: ${result.tax.paye.toLocaleString()}`);
    console.log(`Net Pay: ${result.netPay.toLocaleString()}`);

    // Structural Check
    if (result.tax.paye > 0 && result.tax.breakdown.length === 0) {
        console.error("❌ Tax > 0 but no breakdown!");
    }
}

async function main() {
    test(30000, "Minimum Wage (30k)");
    test(100000, "Junior Staff (100k)");
    test(500000, "Senior Staff (500k)");

    process.exit(0);
}

main().catch(console.error);
