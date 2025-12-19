
import { getDb } from "@/db";
import { taxRules } from "@/db/schema";
import { TaxRulesTable } from "@/components/hr/TaxRulesTable";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { desc } from "drizzle-orm";

export default async function PayrollSettingsPage() {
    const db = await getDb();
    const rules = await db.select().from(taxRules).orderBy(desc(taxRules.createdAt));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Payroll Settings</h2>
                    <p className="text-muted-foreground">Manage tax configurations and payroll rules.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tax Strategies</CardTitle>
                    <CardDescription>
                        Define how PAYE is calculated. You can create multiple strategies (e.g., Finance Act 2020, 2026 Proposed) and switch between them.
                        Editing the JSON allows full control over Tax Bands, Exemptions, and CRA formulas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TaxRulesTable rules={rules} />
                </CardContent>
            </Card>
        </div>
    );
}
