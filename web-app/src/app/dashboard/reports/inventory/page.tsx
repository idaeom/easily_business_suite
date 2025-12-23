import { getInventoryValuation } from "@/actions/inventory-reports";
import { getDb } from "@/db";
import { outlets } from "@/db/schema";
import { InventoryValuationTable } from "@/components/reports/InventoryValuationTable";

export default async function InventoryValuationPage() {
    // 1. Fetch Valuation Data
    const { data: valuationData, summary } = await getInventoryValuation("ALL");

    // 2. Fetch Outlets for Filter
    const db = await getDb();
    const allOutlets = await db.select({ id: outlets.id, name: outlets.name }).from(outlets);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Stock Valuation</h2>
                <p className="text-muted-foreground">
                    Real-time valuation of inventory assets based on Cost Price (COGS).
                </p>
            </div>

            <InventoryValuationTable
                data={valuationData as any}
                summary={summary}
                outlets={allOutlets}
            />
        </div>
    );
}
