import { ExpenseCategoriesSettings } from "@/components/ExpenseCategoriesSettings";

export default function CategoriesSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Expense Categories</h2>
                <p className="text-muted-foreground">Manage the categories available for expense requests.</p>
            </div>
            <ExpenseCategoriesSettings />
        </div>
    );
}
