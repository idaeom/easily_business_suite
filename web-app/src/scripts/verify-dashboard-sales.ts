
import { getDb } from "../db";
import { spSales } from "../db/schema";
import { sql, and, gte, lte } from "drizzle-orm";

async function verifyDashboardSales() {
    console.log("Starting Dashboard Sales Verification...");
    const db = await getDb();

    // Define Today's Range (Match dashboard logic)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`Time Range: ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);

    // Fetch Raw Sales
    const sales = await db.select().from(spSales).where(
        and(
            gte(spSales.createdAt, todayStart),
            lte(spSales.createdAt, todayEnd)
        )
    );

    console.log(`Found ${sales.length} sales for today.`);

    let calculatedTotal = 0;
    sales.forEach(s => {
        const amount = parseFloat(s.total);
        console.log(`- Sale ${s.id}: ₦${amount.toLocaleString()} (${s.createdAt.toISOString()})`);
        calculatedTotal += amount;
    });

    console.log("------------------------------------------------");
    console.log(`Manual Calculation:`);
    console.log(`Total Revenue: ₦${calculatedTotal.toLocaleString()}`);
    console.log(`Transaction Count: ${sales.length}`);
    console.log("------------------------------------------------");

    // Compare with Aggregated Query (Dashboard Logic)
    const [aggregated] = await db.select({
        total: sql<string>`coalesce(sum(${spSales.total}), '0')`,
        count: sql<number>`count(*)`
    })
        .from(spSales)
        .where(
            and(
                gte(spSales.createdAt, todayStart),
                lte(spSales.createdAt, todayEnd)
            )
        );

    console.log(`Dashboard Query Result:`);
    console.log(`Total Revenue: ₦${parseFloat(aggregated.total).toLocaleString()}`);
    console.log(`Transaction Count: ${aggregated.count}`);

    if (Math.abs(calculatedTotal - parseFloat(aggregated.total)) < 0.01 && sales.length === Number(aggregated.count)) {
        console.log("✅ VERIFICATION SUCCESS: Dashboard metrics match raw data.");
    } else {
        console.error("❌ VERIFICATION FAILED: Mismatch detected.");
    }
}

verifyDashboardSales().catch(console.error);
