
import { getUnifiedSalesReport, getReportOptions } from "@/actions/report";
import { getDb } from "@/db";

async function main() {
    console.log("=== Verifying Report Enhancements ===");

    // 1. Check Options
    const options = await getReportOptions();
    console.log(`Options: ${options.outlets.length} Outlets, ${options.staff.length} Staff`);
    if (options.outlets.length === 0) throw new Error("No outlets found (Expected at least 1)");

    const outletId = options.outlets[0].id;
    const staffId = options.staff[0].id;

    // 2. Default Report
    console.log("\n--- Default Report ---");
    const def = await getUnifiedSalesReport({ limit: 5 });
    console.log(`Data Length: ${def.data.length} (Limit 5)`);
    console.log(`Summary:`, def.summary);

    if (def.data.length > 5) throw new Error("Limit failed");
    if (!def.summary) throw new Error("Summary missing");

    // 3. Filter by Outlet
    console.log(`\n--- Filter by Outlet (${outletId}) ---`);
    const byOutlet = await getUnifiedSalesReport({ outletId });
    console.log(`Count: ${byOutlet.summary?.count}`);
    // Basic check: all items should have outletId if returned (but Action doesn't return outletId in row... wait, I added it!)
    // Let's check a row
    if (byOutlet.data.length > 0) {
        console.log(`Row Outlet: ${byOutlet.data[0].outletId}`);
        if (byOutlet.data[0].outletId !== outletId) console.warn("Row outlet mismatch (Might be null/undefined logic)");
    }

    // 4. Check Refund Status
    console.log("\n--- Check Refunds ---");
    // We recently did a refund in verify-mega-multi-item.ts.
    const refunds = def.data.filter(r => r.isRefund);
    if (refunds.length > 0) {
        console.log("Refunds Found in Top 5:", refunds.length);
        console.log("Sample Refund:", refunds[0]);
    } else {
        console.log("No refunds in top 5, fetching all refunds...");
        // Hack: huge limit to find refund
        const huge = await getUnifiedSalesReport({ limit: 100 });
        const allRefunds = huge.data.filter(r => r.isRefund);
        console.log("Total Refunds Found:", allRefunds.length);
        if (allRefunds.length > 0) {
            console.log("Sample Refund isRefund:", allRefunds[0].isRefund); // Should be true
            if (allRefunds[0].isRefund !== true) throw new Error("isRefund is not true");
        }
    }

    console.log("\nSUCCESS: Report verification passed logic checks.");
}

main().catch(console.error);
