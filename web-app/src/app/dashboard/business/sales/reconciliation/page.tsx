
import React from "react";
import { getDb } from "@/db";
import { customerLedgerEntries, contacts, posTransactions, transactionPayments, accounts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { WalletReconciliationTable } from "./WalletReconciliationTable";

export default async function WalletReconciliationPage() {
    const db = await getDb();

    // Fetch Pending Deposits
    // We join with Contact, Transaction -> Payments -> Account
    const pendingDeposits = await db.query.customerLedgerEntries.findMany({
        where: eq(customerLedgerEntries.status, "PENDING"),
        orderBy: [desc(customerLedgerEntries.entryDate)],
        with: {
            customer: true, // Relation name in schema is 'customer'
            transaction: {
                with: {
                    payments: true
                }
            }
        }
    });

    // Manually fetch accounts if relations missing
    const allAccounts = await db.query.accounts.findMany();
    const accountMap = new Map(allAccounts.map(a => [a.id, a.name]));

    const mappedDeposits = pendingDeposits.map(d => {
        const payment = d.transaction?.payments?.[0]; // Assume 1 payment for deposit
        const accountName = payment?.accountId ? accountMap.get(payment.accountId) : "Unknown/Cash";
        const method = payment?.paymentMethodCode || "CASH";

        return {
            id: d.id,
            date: d.entryDate,
            customerName: d.customer.name,
            amount: Number(d.credit),
            method,
            accountName,
            reference: d.description
        };
    });

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-2">
                <Link href="/dashboard/business/sales">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Wallet Funding Reconciliation</h2>
                    <p className="text-muted-foreground">Verify and confirm customer wallet deposits.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Confirmation ({mappedDeposits.length})</CardTitle>
                    <CardDescription>Funds received that have not yet been applied to customer wallets.</CardDescription>
                </CardHeader>
                <CardContent>
                    <WalletReconciliationTable deposits={mappedDeposits} />
                </CardContent>
            </Card>
        </div>
    );
}
