
import { getDb } from "@/db";
import { customerLedgerEntries, posTransactions, transactionPayments, contacts, businessAccounts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { WalletReconciliationClient } from "./WalletReconciliationClient";
import { RevenueNav } from "@/components/finance/RevenueNav";

import { getPendingRevenueCounts } from "@/lib/revenue-utils";

export default async function WalletReconciliationPage() {
    const db = await getDb();
    const { pendingShifts, pendingWallet } = await getPendingRevenueCounts();

    // Fetch ALL Pending Wallet Deposits (independent of shift)
    const pendingDeposits = await db.select({
        id: customerLedgerEntries.id,
        date: customerLedgerEntries.entryDate,
        amount: customerLedgerEntries.credit,
        description: customerLedgerEntries.description,
        customerName: contacts.name,
        paymentMethod: transactionPayments.paymentMethodCode,
        reference: transactionPayments.reference,
        bankAccount: transactionPayments.accountId // We might want to join accounts to get name
    })
        .from(customerLedgerEntries)
        .leftJoin(contacts, eq(customerLedgerEntries.contactId, contacts.id))
        .leftJoin(posTransactions, eq(customerLedgerEntries.transactionId, posTransactions.id))
        .leftJoin(transactionPayments, eq(posTransactions.id, transactionPayments.transactionId))
        .where(eq(customerLedgerEntries.status, "PENDING"))
        .where(eq(customerLedgerEntries.status, "PENDING"))
        .orderBy(desc(customerLedgerEntries.entryDate));

    // Fetch Business Accounts for Wallet Funding
    const fundingAccounts = await db.query.businessAccounts.findMany({
        where: eq(businessAccounts.isEnabled, true)
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Revenue Pro</h1>
                    <p className="text-muted-foreground">
                        Reconcile POS shifts and post revenue to the General Ledger.
                    </p>
                </div>
            </div>

            <RevenueNav pendingShifts={pendingShifts} pendingWallet={pendingWallet} />

            <div>
                <h2 className="text-xl font-semibold tracking-tight">Pending Wallet Confirmations</h2>
                <p className="text-sm text-muted-foreground">
                    Funds received that have not yet been applied to customer wallets.
                </p>
            </div>

            <WalletReconciliationClient initialDeposits={pendingDeposits} fundingAccounts={fundingAccounts} />
        </div>
    );
}
