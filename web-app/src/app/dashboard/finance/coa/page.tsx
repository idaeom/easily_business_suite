
import { getAccounts } from "@/actions/finance";
import { CoaTable } from "@/components/finance/CoaTable";

export default async function ChartOfAccountsPage() {
    const rawAccounts = await getAccounts();

    // Transform if necessary or pass directly if types match
    const accounts = rawAccounts.map(a => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
        balance: a.balance,
        currency: a.currency,
        description: a.description
    }));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
                <p className="text-muted-foreground">
                    View and manage your General Ledger accounts.
                </p>
            </div>

            <CoaTable accounts={accounts} />
        </div>
    );
}
