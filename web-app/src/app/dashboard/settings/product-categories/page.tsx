
import { ProductCategoriesSettings } from "@/components/ProductCategoriesSettings";

export default function ProductCategoriesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Product Categories</h2>
                <p className="text-muted-foreground">
                    Manage categories for Inventory and POS items.
                </p>
            </div>
            <ProductCategoriesSettings />
        </div>
    );
}
