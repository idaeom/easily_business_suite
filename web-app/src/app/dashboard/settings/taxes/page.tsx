
import { getSalesTaxes } from "@/actions/pos-settings";
import { TaxRulesList } from "@/components/settings/TaxRulesList";
import { Separator } from "@/components/ui/separator";

export default async function TaxSettingsPage() {
    const taxes = await getSalesTaxes();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Tax Rules</h3>
                <p className="text-sm text-muted-foreground">
                    Define sales taxes (VAT, Sales Tax, etc.) to apply at checkout.
                </p>
            </div>
            <Separator />
            <TaxRulesList initialData={taxes} />
        </div>
    );
}
