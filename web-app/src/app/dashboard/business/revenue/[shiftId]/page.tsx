import { getDb } from "@/db";
import { posShifts, outlets, users, customerLedgerEntries, posTransactions, transactionPayments, businessAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ReconciliationForm } from "@/components/finance/ReconciliationForm";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ReconciliationDetailPage(props: { params: Promise<{ shiftId: string }> }) {
    const params = await props.params;
    const db = await getDb();

    const shiftData = await db.select({
        id: posShifts.id,
        openedAt: posShifts.startTime,
        closedAt: posShifts.endTime,
        expectedCash: posShifts.expectedCash,
        expectedCard: posShifts.expectedCard,
        expectedTransfer: posShifts.expectedTransfer,
        declaredCash: posShifts.actualCash,
        declaredCard: posShifts.actualCard,
        declaredTransfer: posShifts.actualTransfer,
        outletName: outlets.name,
        cashierName: users.name,
    })
        .from(posShifts)
        .leftJoin(outlets, eq(posShifts.outletId, outlets.id))
        .leftJoin(users, eq(posShifts.cashierId, users.id))
        .where(eq(posShifts.id, params.shiftId))
        .limit(1);

    if (!shiftData || shiftData.length === 0) {
        redirect("/dashboard/business/revenue");
    }

    const shift = {
        ...shiftData[0],
        expectedCash: Number(shiftData[0].expectedCash),
        expectedCard: Number(shiftData[0].expectedCard),
        expectedTransfer: Number(shiftData[0].expectedTransfer),
        declaredCash: Number(shiftData[0].declaredCash),
        declaredCard: Number(shiftData[0].declaredCard),
        declaredTransfer: Number(shiftData[0].declaredTransfer),
        outletName: shiftData[0].outletName || "Unknown",
        cashierName: shiftData[0].cashierName || "Unknown",
    };

    // Fetch Pending Wallet Deposits linked to this shift
    // (Transactions in this shift that generated a PENDING Ledger Entry)
    const walletDeposits = await db.select({
        amount: transactionPayments.amount,
        method: transactionPayments.paymentMethodCode
    })
        .from(customerLedgerEntries)
        .innerJoin(posTransactions, eq(customerLedgerEntries.transactionId, posTransactions.id))
        .innerJoin(transactionPayments, eq(posTransactions.id, transactionPayments.transactionId))
        .where(and(
            eq(posTransactions.shiftId, params.shiftId),
            eq(customerLedgerEntries.status, "PENDING")
        ));

    const pendingWalletTotal = walletDeposits.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const pendingWalletCount = walletDeposits.length;

    const walletDepositsCash = walletDeposits
        .filter(d => d.method === "CASH")
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const walletDepositsCard = walletDeposits
        .filter(d => d.method !== "CASH") // CARD or TRANSFER
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const accountsList = await db.query.businessAccounts.findMany({
        where: eq(businessAccounts.isEnabled, true)
    });

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/business/revenue">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Reconcile Shift</h1>
                    <p className="text-muted-foreground">
                        {shift.outletName} • {shift.cashierName}
                    </p>
                </div>
            </div>

            <ReconciliationForm
                shift={shift}
                pendingWalletTotal={pendingWalletTotal}
                pendingWalletCount={pendingWalletCount}
                walletDepositsCash={walletDepositsCash}
                walletDepositsCard={walletDepositsCard}
                accountsList={accountsList}
            />
        </div>
    );
}
