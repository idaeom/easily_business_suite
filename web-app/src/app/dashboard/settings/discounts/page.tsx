
import { getDiscounts } from "@/actions/pos-settings";
import { DiscountsList } from "@/components/settings/DiscountsList";
import { Separator } from "@/components/ui/separator";

export default async function DiscountSettingsPage() {
    const discounts = await getDiscounts();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Discounts</h3>
                <p className="text-sm text-muted-foreground">
                    Create pre-defined discounts for quick application at checkout.
                </p>
            </div>
            <Separator />
            <DiscountsList initialData={discounts} />
        </div>
    );
}
