import { getPosProducts, getActiveShift, getShiftMetrics, getTopSellingItems } from "@/actions/pos";
import { getSalesTaxes, getDiscounts } from "@/actions/pos-settings";
import { getDb } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth";
import PosInterface from "@/components/pos/PosInterface";
import { redirect } from "next/navigation";

export default async function PosPage() {
    const user = await getAuthenticatedUser();
    if (!user) redirect("/login");

    const db = await getDb();
    const outlet = await db.query.outlets.findFirst();

    // Parallel Fetching
    const [
        productsData, // Returns { products, totalCount, totalPages }
        activeShift,
        taxes,
        discounts,
        topItems
    ] = await Promise.all([
        getPosProducts("", 1, 20),
        getActiveShift(),
        getSalesTaxes(),
        getDiscounts(),
        getTopSellingItems(5)
    ]);

    // Fetch Metrics if Shift is Open
    const metrics = activeShift ? await getShiftMetrics(activeShift.id) : { itemsSold: 0, transactionCount: 0, totalRevenue: 0 };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-4">
                <h2 className="text-3xl font-bold tracking-tight">Invoice Pro POS</h2>
                <p className="text-muted-foreground">Point of Sale & Invoicing</p>
            </div>

            <PosInterface
                initialProducts={productsData.products as any[]}
                totalProducts={productsData.totalCount}
                activeShift={activeShift}
                shiftMetrics={metrics}
                user={user}
                taxes={taxes}
                discounts={discounts}
                topItems={topItems as any[]}
                loyaltySettings={{
                    earningRate: Number(outlet?.loyaltyEarningRate || 0),
                    redemptionRate: Number(outlet?.loyaltyRedemptionRate || 1)
                }}
            />
        </div>
    );
}
