
import { getFinancialStatements, getPayrollReports } from "@/actions/reports";
import { getDb } from "@/db";

async function main() {
    console.log("🚀 Starting Financial Reports Verification...");

    const db = await getDb();

    // 1. Verify Financial Statements
    console.log("\n1. Testing Financial Statements (Balance Sheet & P&L)...");
    const financials = await getFinancialStatements();

    console.log("--- Balance Sheet ---");
    console.log(`Total Assets: ₦${financials.balanceSheet.assets.total.toLocaleString()}`);
    financials.balanceSheet.assets.current.forEach(a => console.log(`   ${a.name}: ${a.amount.toLocaleString()}`));
    financials.balanceSheet.assets.fixed.forEach(a => console.log(`   ${a.name}: ${a.amount.toLocaleString()}`));

    console.log(`Total Liabilities: ₦${financials.balanceSheet.liabilities.total.toLocaleString()}`);
    financials.balanceSheet.liabilities.current.forEach(l => console.log(`   ${l.name}: ${l.amount.toLocaleString()}`));
    financials.balanceSheet.liabilities.longTerm.forEach(l => console.log(`   ${l.name}: ${l.amount.toLocaleString()}`));

    console.log(`Total Equity: ₦${financials.balanceSheet.totalEquity.toLocaleString()}`);
    financials.balanceSheet.equity.forEach(e => console.log(`   ${e.name}: ${e.amount.toLocaleString()}`));

    console.log("--- Profit & Loss ---");
    console.log(`Total Revenue: ₦${financials.profitAndLoss.totalRevenue.toLocaleString()}`);
    console.log(`Total COGS: ₦${financials.profitAndLoss.totalCogs.toLocaleString()}`);
    console.log(`Gross Profit: ₦${financials.profitAndLoss.grossProfit.toLocaleString()}`);
    console.log(`Total OpEx: ₦${financials.profitAndLoss.totalOperatingExpenses.toLocaleString()}`);
    console.log(`Net Profit: ₦${financials.profitAndLoss.netProfit.toLocaleString()}`);

    // Check Accounting Equation: Assets = Liabilities + Equity + Net Profit (if not closed)
    // Note: Our logic ADDS Net Profit to Equity in the return object already.
    // So distinct Equity usually includes Retained Earnings?
    // In reports.ts we did: balanceSheet.totalEquity += profitAndLoss.netProfit;
    // So Assets should equal Liabilities + TotalEquity directly.

    // const totalEquityAndProfit = financials.balanceSheet.totalEquity + financials.profitAndLoss.netProfit;
    // Actually, check reports.ts again. Yes, we added it.

    const diff = financials.balanceSheet.assets.total - (financials.balanceSheet.liabilities.total + financials.balanceSheet.totalEquity);

    if (Math.abs(diff) < 0.01) {
        console.log("✅ SUCCESS: Accounting Equation Balanced (Assets = Liabilities + Equity)");
    } else {
        console.error(`❌ FAILURE: Accounting Equation Imbalanced by ₦${diff}`);
        console.log("Debug: Assets", financials.balanceSheet.assets.total);
        console.log("Debug: Liabilities", financials.balanceSheet.liabilities.total);
        console.log("Debug: Equity", financials.balanceSheet.totalEquity);
    }

    // 2. Verify Payroll Reports
    console.log("\n2. Testing Payroll Reports...");
    const payroll = await getPayrollReports();

    console.log(`Run Count: ${payroll.summary.runCount}`);
    console.log(`Total Gross: ₦${payroll.summary.totalGross.toLocaleString()}`);
    console.log(`Total Net: ₦${payroll.summary.totalNet.toLocaleString()}`);
    console.log(`Total Tax: ₦${payroll.summary.totalTax.toLocaleString()}`);
    console.log(`Total Pension: ₦${payroll.summary.totalPension.toLocaleString()}`);

    if (payroll.summary.runCount > 0 && payroll.summary.totalNet > 0) {
        console.log("✅ SUCCESS: Payroll Data Retrieved");
    } else {
        console.warn("⚠️ WARNING: No Payroll Data found (Check if runs exist)");
    }

    if (payroll.taxSchedule.length > 0) {
        console.log(`✅ SUCCESS: Tax Schedule Generated (${payroll.taxSchedule.length} entries)`);
    }

    console.log("\nDone.");
    process.exit(0);
}

main().catch(console.error);
