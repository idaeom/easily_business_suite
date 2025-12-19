
import { LoyaltyConfig } from "@/components/settings/LoyaltyConfig";
import { Separator } from "@/components/ui/separator";
import { getDb } from "@/db";

// Force dynamic to ensure fresh fetch
export const dynamic = "force-dynamic";

export default async function LoyaltySettingsPage() {
    const db = await getDb();
    const outlet = await db.query.outlets.findFirst();

    if (!outlet) {
        return (
            <div className="p-6">
                <h3 className="text-lg font-medium">No Outlet Found</h3>
                <p>Please configure an outlet in Organization settings first.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Loyalty Program</h3>
                <p className="text-sm text-muted-foreground">
                    Configure customer rewards (Cashback points).
                </p>
            </div>
            <Separator />
            <LoyaltyConfig
                outletId={outlet.id}
                earningRate={outlet.loyaltyEarningRate?.toString() || "0.05"}
                redemptionRate={outlet.loyaltyRedemptionRate?.toString() || "1.0"}
            />
        </div>
    );
}
