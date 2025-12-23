
import { getFinancialStatements, getPayrollReports } from "@/actions/reports";
import { getDb } from "@/db";

async function main() {
    console.log("🚀 Starting Financial Reports Verification...");

    const db = await getDb();

    // 1. Verify Financial Statements
    console.log("\n1. Testing Financial Statements (Balance Sheet & P&L)...");
    const financials = await getFinancialStatements();

    console.log("--- Balance Sheet ---");
    console.log(`Total Assets: ₦${financials.balanceSheet.totalAssets.toLocaleString()}`);
    console.log(`Total Liabilities: ₦${financials.balanceSheet.totalLiabilities.toLocaleString()}`);
    console.log(`Total Equity: ₦${financials.balanceSheet.totalEquity.toLocaleString()}`);

    console.log("--- Profit & Loss ---");
    console.log(`Total Income: ₦${financials.profitAndLoss.totalIncome.toLocaleString()}`);
    console.log(`Total Expenses: ₦${financials.profitAndLoss.totalExpenses.toLocaleString()}`);
    console.log(`Net Profit: ₦${financials.profitAndLoss.netProfit.toLocaleString()}`);

    // Check Accounting Equation: Assets = Liabilities + Equity + Net Profit (if not closed)
    const totalEquityAndProfit = financials.balanceSheet.totalEquity + financials.profitAndLoss.netProfit;
    const diff = financials.balanceSheet.totalAssets - (financials.balanceSheet.totalLiabilities + totalEquityAndProfit);

    if (Math.abs(diff) < 0.01) {
        console.log("✅ SUCCESS: Accounting Equation Balanced (Assets = Liabilities + Equity + Earnings)");
    } else {
        console.error(`❌ FAILURE: Accounting Equation Imbalanced by ₦${diff}`);
        console.log("Debug: Assets", financials.balanceSheet.totalAssets);
        console.log("Debug: Liabilities", financials.balanceSheet.totalLiabilities);
        console.log("Debug: Equity", financials.balanceSheet.totalEquity);
        console.log("Debug: Net Profit", financials.profitAndLoss.netProfit);
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
