"use server";

import { items, posTransactions, contacts, transactionPayments, posShifts, outlets, taxRules, discounts, transactions, ledgerEntries, customerLedgerEntries, accounts, shiftReconciliations, shiftCashDeposits, inventory, salesTaxes, businessAccounts, loyaltyLogs } from "@/db/schema";
import { eq, and, desc, sql, inArray, gte, lte, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditAction } from "./audit";
import { roundToTwo } from "@/lib/utils/math";
import { confirmWalletDeposit } from "@/actions/customer-ledger";
import { calculateTax } from "@/lib/utils/tax-utils";


// =========================================
// SHIFT MANAGEMENT
// =========================================

export async function addShiftCashDeposit(data: {
    shiftId: string;
    amount: number;
    accountId?: string;
    reference?: string;
    notes?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Verify Shift
    const shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.id, data.shiftId)
    });
    if (!shift) throw new Error("Shift not found");

    await db.insert(shiftCashDeposits).values({
        shiftId: data.shiftId,
        amount: data.amount.toString(),
        accountId: data.accountId,
        reference: data.reference,
        notes: data.notes,
        depositedById: user.id
    });

    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath(`/dashboard/business/pos/shifts/${data.shiftId}`);
    }
    return { success: true };
}

export async function getActiveShift() {
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const db = await getDb();
    const shift = await db.query.posShifts.findFirst({
        where: and(eq(posShifts.cashierId, user.id), eq(posShifts.status, "OPEN"))
    });
    return shift;
}

export async function openShift(startCash: number, outletId?: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    // Check existing
    const existing = await getActiveShift();
    if (existing) throw new Error("You already have an open shift.");

    const [shift] = await db.insert(posShifts).values({
        cashierId: user.id,
        outletId: outletId, // Optional, can be inferred or passed
        startCash: startCash.toString(),
        startTime: new Date(),
        status: "OPEN"
    }).returning();

    await logAuditAction(user.id, "OPEN_SHIFT", shift.id, "SHIFT", { startCash });
    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/business/pos");
    }
    return { success: true, shift };
}


export async function getShiftSummary(shiftId: string) {
    const user = await getAuthenticatedUser();
    if (!user) return null;
    const db = await getDb();

    // Fetch Shift Details
    const shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.id, shiftId),
        with: {
            cashDeposits: true
        }
    });

    if (!shift) return {};

    // Fetch Completed Trans
    const txs = await db.query.posTransactions.findMany({
        where: and(eq(posTransactions.shiftId, shiftId), eq(posTransactions.status, "COMPLETED")),
        with: { payments: true }
    });

    const summary: Record<string, number> = {};

    // Z-Report Metrics
    let grossSales = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalRefunds = 0;
    let netSales = 0;
    let cashSales = 0;
    let cashRefunds = 0;

    txs.forEach(tx => {
        const amount = Number(tx.totalAmount);
        const tax = Number(tx.taxAmount || 0);
        const discount = Number(tx.discountAmount || 0);

        if (tx.isRefund) {
            totalRefunds += Math.abs(amount);
            // Check payments for Cash Refund
            tx.payments.forEach(p => {
                if (p.paymentMethodCode === "CASH") {
                    cashRefunds += Math.abs(Number(p.amount));
                }
                const key = p.paymentMethodCode;
                summary[key] = (summary[key] || 0) - Math.abs(Number(p.amount));
            });
        } else {
            grossSales += amount;
            totalTax += tax;
            totalDiscount += discount;

            tx.payments.forEach(p => {
                const key = p.paymentMethodCode;
                summary[key] = (summary[key] || 0) + Number(p.amount);
                if (key === "CASH") cashSales += Number(p.amount);
            });
        }
    });

    netSales = grossSales - totalTax;

    const startCash = Number(shift.startCash);
    // Explicitly set CASH to expected drawer for reconciliation
    const expectedDrawer = startCash + (summary["CASH"] || 0);
    summary["CASH"] = expectedDrawer;

    // Add Deposits
    shift.cashDeposits.forEach(d => {
        if (d.accountId && d.amount) {
            const key = `CASH_DEPOSIT:${d.accountId}`;
            summary[key] = (summary[key] || 0) + Number(d.amount);
        }
    });

    return {
        ...summary,
        zReport: {
            shiftId: shift.id,
            openedAt: shift.startTime,
            closedAt: shift.endTime || new Date(),
            startCash,
            grossSales,
            netSales,
            totalTax,
            totalDiscount,
            totalRefunds,
            transactionCount: txs.length,
            cashSales,
            cashRefunds,
            expectedDrawer
        }
    };
}


export async function closeShift(shiftId: string, actuals: Record<string, number>) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    // 1. Calculate Expected
    // 1. Calculate Expected
    const expected: any = (await getShiftSummary(shiftId)) || {};

    // 2. Insert Reconciliations
    const allMethods = new Set([...Object.keys(expected), ...Object.keys(actuals)]);

    for (const key of allMethods) {
        const exp = expected[key] || 0;
        const act = actuals[key] || 0;

        // Parse Key: "METHOD" or "METHOD:ACCOUNT"
        const [method, accountId] = key.split(":");

        // Skip CASH_DEPOSIT aggregation (Handled individually in shiftCashDeposits)
        if (method === "CASH_DEPOSIT" || method === "zReport") continue;

        await db.insert(shiftReconciliations).values({
            shiftId,
            paymentMethodCode: method,
            accountId: accountId || null, // Store specific account
            expectedAmount: exp.toString(),
            actualAmount: act.toString(),
            difference: (act - exp).toString(),
            status: "PENDING"
        });
    }

    // 3. Close Shift (Pending Reconciliation)
    const cashTotal = expected["CASH"] || 0;
    const cardTotal = expected["CARD"] || 0;
    const transferTotal = expected["TRANSFER"] || 0;

    await db.update(posShifts).set({
        endTime: new Date(),
        status: "CLOSED",
        // Legacy Columns (Approximate)
        expectedCash: cashTotal.toString(),
        actualCash: (actuals["CASH"] || 0).toString(),
        expectedCard: cardTotal.toString(),
        actualCard: (actuals["CARD"] || 0).toString(),
        expectedTransfer: transferTotal.toString(),
        actualTransfer: (actuals["TRANSFER"] || 0).toString(),
    }).where(eq(posShifts.id, shiftId));

    // 4. Audit Only (No GL)
    await logAuditAction(user.id, "CLOSE_SHIFT", shiftId, "SHIFT", {
        expected,
        actuals
    });

    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/business/pos");
    }
    return { success: true };
}

export async function reconcileShift(shiftId: string, data?: {
    verifiedCash: number;
    verifiedCard: number;
    verifiedTransfer?: number;
    cashAccountId?: string;
    cardAccountId?: string;
    transferAccountId?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();
    const shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.id, shiftId),
    });

    if (!shift || shift.status !== "CLOSED") throw new Error("Shift must be CLOSED to reconcile");

    // 1. Resolve GL Accounts from Selected Business Accounts
    let cashGLAccountId: string | undefined;
    let cardGLAccountId: string | undefined;
    let transferGLAccountId: string | undefined;

    if (data?.cashAccountId) {
        const ba = await db.query.businessAccounts.findFirst({ where: eq(businessAccounts.id, data.cashAccountId) });
        if (ba?.glAccountId) cashGLAccountId = ba.glAccountId;
    }
    if (data?.cardAccountId) {
        const ba = await db.query.businessAccounts.findFirst({ where: eq(businessAccounts.id, data.cardAccountId) });
        if (ba?.glAccountId) cardGLAccountId = ba.glAccountId;
    }
    if (data?.transferAccountId) {
        const ba = await db.query.businessAccounts.findFirst({ where: eq(businessAccounts.id, data.transferAccountId) });
        if (ba?.glAccountId) transferGLAccountId = ba.glAccountId;
    }

    // Default Fallback (Undeposited Funds / Bank) if selection failed but amount exists?
    // Ideally we enforce selection, but for resilience finding a default asset account is good.
    // Simplifying: If no GL Account found, we might skip posting that line or error.
    // We will proceed, but log warning if amounts exist but no account.

    // 2. Calculate Variances & Totals
    const expectedCash = Number(shift.expectedCash);
    const expectedCard = Number(shift.expectedCard);
    const expectedTransfer = Number(shift.expectedTransfer || 0);

    const verifiedCash = data?.verifiedCash || 0;
    const verifiedCard = data?.verifiedCard || 0;
    const verifiedTransfer = data?.verifiedTransfer || 0;

    const totalVerified = verifiedCash + verifiedCard + verifiedTransfer;
    const totalExpected = expectedCash + expectedCard + expectedTransfer;
    const variance = totalVerified - totalExpected;

    // 3. Post to General Ledger
    const glTxId = crypto.randomUUID();

    // Header
    await db.insert(transactions).values({
        id: glTxId,
        date: new Date(),
        description: `Shift Reconciliation #${shiftId.slice(0, 8)}`,
        status: "POSTED",
        reference: shiftId,
        metadata: { type: "SHIFT_RECONCILIATION", shiftId }
    });

    // Credits: Sales Revenue
    // Using simple "Sales" account. In reality, should split by Net Sales & Tax Liability.
    // Fetch generic Sales Account
    const salesAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "4000") });
    if (salesAccount) {
        // Credit Revenue (Income)
        await db.insert(ledgerEntries).values({
            transactionId: glTxId,
            accountId: salesAccount.id,
            amount: totalExpected.toString(), // We credit what we EXPECTED to earn (Revenue)
            direction: "CREDIT",
            description: "Shift Revenue Recognized"
        });
        // Update Balance (Income increases with Credit? Depends on system. Usually Credit increases Equity/Liability/Income)
        // Assuming strict double entry: Income is Credit normal.
        await db.update(accounts).set({ balance: sql`${accounts.balance} + ${totalExpected}` }).where(eq(accounts.id, salesAccount.id));
    }

    // Debits: Assets (Where money actually went)
    if (verifiedCash > 0 && cashGLAccountId) {
        await db.insert(ledgerEntries).values({
            transactionId: glTxId,
            accountId: cashGLAccountId,
            amount: verifiedCash.toString(),
            direction: "DEBIT",
            description: "Cash Collected"
        });
        await db.update(accounts).set({ balance: sql`${accounts.balance} + ${verifiedCash}` }).where(eq(accounts.id, cashGLAccountId));
    }

    if (verifiedCard > 0 && cardGLAccountId) {
        await db.insert(ledgerEntries).values({
            transactionId: glTxId,
            accountId: cardGLAccountId,
            amount: verifiedCard.toString(),
            direction: "DEBIT",
            description: "Card Sales Cleared"
        });
        await db.update(accounts).set({ balance: sql`${accounts.balance} + ${verifiedCard}` }).where(eq(accounts.id, cardGLAccountId));
    }

    if (verifiedTransfer > 0 && transferGLAccountId) {
        await db.insert(ledgerEntries).values({
            transactionId: glTxId,
            accountId: transferGLAccountId,
            amount: verifiedTransfer.toString(),
            direction: "DEBIT",
            description: "Bank Transfers Received"
        });
        await db.update(accounts).set({ balance: sql`${accounts.balance} + ${verifiedTransfer}` }).where(eq(accounts.id, transferGLAccountId));
    }

    // Variance (Expense/Income)
    // If Variance < 0 (Shortage), we need a DEBIT to Expense to balance.
    // If Variance > 0 (Overage), we need a CREDIT to Income (Other Income) to balance.
    /*
        Example: Expected 100 (Cr Revenue 100). Verified 90 (Dr Asset 90).
        Need Dr 10. (Expense).
        Equation: Dr 90 + Dr 10 = Cr 100.
    */
    if (Math.abs(variance) > 0) {
        const varianceAccount = await db.query.accounts.findFirst({
            where: eq(accounts.name, "Cash Over/Short")
        });

        if (varianceAccount) {
            if (variance < 0) {
                // Shortage (Expense) -> DEBIT
                await db.insert(ledgerEntries).values({
                    transactionId: glTxId,
                    accountId: varianceAccount.id,
                    amount: Math.abs(variance).toString(),
                    direction: "DEBIT",
                    description: "Cash Shortage"
                });
                await db.update(accounts).set({ balance: sql`${accounts.balance} + ${Math.abs(variance)}` }).where(eq(accounts.id, varianceAccount.id));
            } else {
                // Overage (Income) -> CREDIT
                await db.insert(ledgerEntries).values({
                    transactionId: glTxId,
                    accountId: varianceAccount.id,
                    amount: variance.toString(),
                    direction: "CREDIT",
                    description: "Cash Overage"
                });
                await db.update(accounts).set({ balance: sql`${accounts.balance} + ${variance}` }).where(eq(accounts.id, varianceAccount.id));
            }
        }
    }

    await db.update(posShifts).set({
        status: "RECONCILED",
        verifiedCash: data?.verifiedCash?.toString(),
        verifiedCard: data?.verifiedCard?.toString(),
        verifiedTransfer: data?.verifiedTransfer?.toString(),
        isReconciled: true
    }).where(eq(posShifts.id, shiftId));

    await logAuditAction(user.id, "RECONCILE_SHIFT", shiftId, "SHIFT", {
        note: "GL Posted via Business Account Profiling",
        verifiedCash: data?.verifiedCash,
        verifiedCard: data?.verifiedCard,
        glTransactionId: glTxId
    });

    // 4. Confirm Wallet Deposits
    // Find all PENDING Ledger Entries for this Shift's Transactions
    // Wallet Funding Tx -> Ledger Entry (Pending)
    const pendingWalletDeposits = await db.query.customerLedgerEntries.findMany({
        where: and(
            eq(customerLedgerEntries.status, "PENDING"),
            inArray(
                customerLedgerEntries.transactionId,
                db.select({ id: posTransactions.id })
                    .from(posTransactions)
                    .where(eq(posTransactions.shiftId, shiftId))
            )
        )
    });

    console.log(`[Reconcile] Found ${pendingWalletDeposits.length} pending wallet deposits to confirm.`);

    for (const entry of pendingWalletDeposits) {
        try {
            await confirmWalletDeposit(entry.id);
            console.log(`[Reconcile] Confirmed Wallet Deposit: ${entry.id}`);
        } catch (e) {
            console.error(`[Reconcile] Failed to confirm deposit ${entry.id}:`, e);
            // Non-blocking? Or should we fail?
            // Ideally non-blocking so shift closes, but we log error.
        }
    }

    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/business/revenue");
    }
    return { success: true };
}

// =========================================
// POS TRANSACTION
// =========================================

export interface ProcessTransactionData {
    shiftId: string;
    contactId?: string; // Optional Customer
    items: { itemId: string; quantity: number; price: number; name: string }[];
    payments: { methodCode: string; amount: number; reference?: string; accountId?: string }[];
    // Enhancements
    discountId?: string;
    discountAmount?: number;
    taxAmount?: number;
    taxSnapshot?: any[];
    loyaltyPointsEarned?: number;
    loyaltyPointsRedeemed?: number;
    finalTotal?: number; // Explicit total from calculator
}

export async function processTransaction(data: ProcessTransactionData) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();
    return await processTransactionCore(data, user, db);
}


export async function processTransactionCore(data: ProcessTransactionData, user: any, db: any, skipRevalidation = false) {

    // 1. Validation & Tax Calculation
    const subtotal = roundToTwo(data.items.reduce((sum, i) => sum + (i.quantity * i.price), 0));

    // Server-Side Tax Calculation (Source of Truth)
    const taxes = await db.select().from(salesTaxes).where(eq(salesTaxes.isEnabled, true));
    const taxResult = calculateTax(subtotal, taxes);

    const expectedTotal = roundToTwo(taxResult.finalTotal - (data.discountAmount || 0));
    const totalPaid = roundToTwo(data.payments.reduce((sum, p) => sum + p.amount, 0));

    // Allow slight float diff (e.g., if client sent slightly different total, strictly enforce server total or allow tolerance? 
    // Ideally we trust server total. If paid is less, error. If paid is more (change), handled by UI or we record "change" here?
    // POS usually sends exact tender. If cash, "Change" is handled client side, server sees exact total or Payment=Total. 
    // Let's assume passed payments must match server expectation.

    // Note: If discount applied, it should be handled. Existing logic passed `finalTotal` which might include discount.
    // We haven't implemented Discount logic in `calculateTax` yet (it takes subtotal). 
    // We should treat discount as pre-tax or post-tax? Usually depends. 
    // The current flow in `pos.ts` expects `finalTotal` from client.

    // For now, let's just override data.taxAmount with our server-calculated tax to ensure reporting accuracy, 
    // but check if client total matches our `subtotal + tax`. 
    // IF discount is present, logic gets complex without a discount engine.
    // Let's assume for this task: `finalTotal` = `taxResult.finalTotal`.
    // If client sent a different total, likely they didn't have the updated tax rates. FAIL the transaction.

    if (Math.abs(expectedTotal - totalPaid) > 0.05) {
        throw new Error(`Payment mismatch: Server Calculated ${expectedTotal}, Paid ${totalPaid}. Ensure Tax Rules are synced.`);
    }

    // Check Loyalty Balance if redeeming
    if (data.loyaltyPointsRedeemed && data.loyaltyPointsRedeemed > 0) {
        if (!data.contactId) throw new Error("Customer required for loyalty redemption");
        const customer = await db.query.contacts.findFirst({
            where: eq(contacts.id, data.contactId),
            columns: { loyaltyPoints: true }
        });
        const currentPoints = Number(customer?.loyaltyPoints || 0);
        if (currentPoints < data.loyaltyPointsRedeemed) {
            throw new Error(`Insufficient loyalty points. Balance: ${currentPoints}`);
        }
    }

    // Server-Side Loyalty Calculation
    let pointsEarned = 0;
    if (data.contactId) {
        // Fetch Outlet Settings via Shift
        const shiftInfo = await db.query.posShifts.findFirst({
            where: eq(posShifts.id, data.shiftId),
            with: { outlet: true }
        });

        // Default to system default if not set (0.05 = 5%)
        const earningRate = Number(shiftInfo?.outlet?.loyaltyEarningRate ?? "0.05");

        // Calculate points based on Net Paid (Total Paid - Amount Paid via Loyalty)
        // This prevents "Double Dipping" where you earn points on the redeemed amount.
        const loyaltyPayment = data.payments.find(p => p.methodCode === "LOYALTY")?.amount || 0;
        const earningBase = Math.max(0, totalPaid - loyaltyPayment);

        pointsEarned = Number((earningBase * earningRate).toFixed(2));
    }

    // Override client data with server calculation
    data.loyaltyPointsEarned = pointsEarned;


    // 2. Create Transaction
    const [tx] = await db.insert(posTransactions).values([{
        shiftId: data.shiftId,
        contactId: data.contactId,
        totalAmount: expectedTotal.toString(), // Use Server Total
        status: "COMPLETED",
        itemsSnapshot: data.items.map(i => ({
            itemId: i.itemId,
            name: i.name,
            qty: i.quantity,
            price: i.price
        })),
        transactionDate: new Date(),
        // New Fields
        discountId: data.discountId,
        discountAmount: data.discountAmount?.toString() || "0",
        taxAmount: taxResult.totalTax.toString(), // Use Server Tax
        taxSnapshot: taxResult.breakdown, // Save Breakdown
        loyaltyPointsEarned: data.loyaltyPointsEarned?.toString() || "0",
        loyaltyPointsRedeemed: data.loyaltyPointsRedeemed?.toString() || "0",
    }]).returning();

    // 3. Record Payments
    await db.insert(transactionPayments).values(
        data.payments.map(p => ({
            transactionId: tx.id,
            paymentMethodCode: p.methodCode,
            amount: p.amount.toString(),
            accountId: p.accountId,
            reference: p.reference
        }))
    );

    // 4. Update Stock (Allow Negative) - Only for Physical
    // Resolve Shift Outlet
    const shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.id, data.shiftId),
        columns: { outletId: true }
    });
    const outletId = shift?.outletId;

    const itemIds = data.items.map(i => i.itemId);
    const dbItems = await db.select().from(items).where(inArray(items.id, itemIds));
    const dbItemsMap = new Map((dbItems as any[]).map(i => [i.id, i]));

    if (outletId) {
        for (const item of data.items) {
            const dbItem = dbItemsMap.get(item.itemId);
            if (dbItem && ["RESALE", "MANUFACTURED", "RAW_MATERIAL"].includes(dbItem.itemType)) {

                // Update Branch Inventory
                const result = await db.update(inventory)
                    .set({ quantity: sql`${inventory.quantity} - ${item.quantity}` })
                    .where(and(eq(inventory.itemId, item.itemId), eq(inventory.outletId, outletId)))
                    .returning();

                // Auto-create if missing (e.g. first transaction for this item in this branch)
                if (result.length === 0) {
                    await db.insert(inventory).values({
                        itemId: item.itemId,
                        outletId: outletId,
                        quantity: (0 - item.quantity).toString()
                    });
                }
            }
        }
    }

    // 5. Update Loyalty Points
    if (data.contactId) {
        const earned = data.loyaltyPointsEarned || 0;
        const redeemed = data.loyaltyPointsRedeemed || 0;
        const netChange = earned - redeemed;

        if (netChange !== 0) {
            await db.update(contacts)
                .set({ loyaltyPoints: sql`${contacts.loyaltyPoints} + ${netChange} ` })
                .where(eq(contacts.id, data.contactId));

            // Log Earn
            if (earned > 0) {
                await db.insert(loyaltyLogs).values({
                    contactId: data.contactId,
                    outletId: outletId,
                    points: earned.toString(),
                    type: "EARN",
                    referenceId: tx.id,
                    description: `Earned points from Sale #${tx.id.slice(0, 8)}`
                });
            }

            // Log Redeem
            if (redeemed > 0) {
                await db.insert(loyaltyLogs).values({
                    contactId: data.contactId,
                    outletId: outletId,
                    points: (-redeemed).toString(),
                    type: "REDEEM",
                    referenceId: tx.id,
                    description: `Redeemed points on Sale #${tx.id.slice(0, 8)}`
                });
            }
        }

        // Ledger Entries (Debit/Credit)
        // Debit Customer for Sale
        await db.insert(customerLedgerEntries).values({
            contactId: data.contactId,
            transactionId: tx.id,
            description: `POS Sale #${tx.id.slice(0, 8)} `,
            entryDate: new Date(),
            debit: expectedTotal.toString(),
            balanceAfter: "0"
        });

        // Credit Customer for Payment
        await db.insert(customerLedgerEntries).values({
            contactId: data.contactId,
            transactionId: tx.id,
            description: `Payment for #${tx.id.slice(0, 8)}`,
            entryDate: new Date(),
            credit: totalPaid.toString(),
            balanceAfter: "0"
        });
    }

    // 6. COGS POSTING (Cost of Goods Sold)
    let totalCost = 0;
    // itemIds defined earlier?
    // Line 589: const itemIds = data.items.map(i => i.itemId); available.
    // Line 591: const dbItemsMap... available.

    data.items.forEach(item => {
        const dbItem = dbItemsMap.get(item.itemId);
        if (dbItem && ["RESALE", "MANUFACTURED"].includes(dbItem.itemType)) {
            const cost = Number(dbItem.costPrice || 0);
            totalCost += (cost * item.quantity);
        }
    });

    if (totalCost > 0) {
        const cogsTxId = crypto.randomUUID();
        const cogsAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "5000") });
        const inventoryAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1300") });

        if (cogsAccount && inventoryAccount) {
            await db.insert(transactions).values({
                id: cogsTxId,
                date: new Date(),
                description: `COGS for Sale #${tx.id.slice(0, 8)}`,
                status: "POSTED",
                reference: tx.id,
                metadata: { type: "COGS", posTransactionId: tx.id }
            });

            // DEBIT COGS (Expense Increase)
            await db.insert(ledgerEntries).values({
                transactionId: cogsTxId,
                accountId: cogsAccount.id,
                amount: totalCost.toString(),
                direction: "DEBIT",
                description: "Cost of Goods Sold"
            });
            await db.update(accounts).set({ balance: sql`${accounts.balance} + ${totalCost}` }).where(eq(accounts.id, cogsAccount.id));

            // CREDIT INVENTORY (Asset Decrease)
            await db.insert(ledgerEntries).values({
                transactionId: cogsTxId,
                accountId: inventoryAccount.id,
                amount: totalCost.toString(),
                direction: "CREDIT",
                description: "Inventory Relief"
            });
            await db.update(accounts).set({ balance: sql`${accounts.balance} - ${totalCost}` }).where(eq(accounts.id, inventoryAccount.id));
        }
    }

    if (!skipRevalidation && process.env.IS_SCRIPT !== "true") revalidatePath("/dashboard/business/pos");
    return { success: true, transactionId: tx.id };
}

export async function getPosProducts(query?: string, page = 1, limit = 20, overrideOutletId?: string) {
    const user = overrideOutletId ? undefined : await getAuthenticatedUser();
    const db = await getDb();
    const offset = (page - 1) * limit;

    const outletId = overrideOutletId || user?.outletId;

    // Filter Condition
    const whereCondition = and(
        eq(items.itemType, "RESALE"),
        query ? sql`lower(${items.name}) LIKE ${`%${query.toLowerCase()}%`}` : undefined
    );

    // Fetch Products with Branch Inventory
    const results = await db.select({
        id: items.id,
        name: items.name,
        price: items.price,
        costPrice: items.costPrice,
        category: items.category,
        imageUrl: items.imageUrl,
        itemType: items.itemType,
        sku: items.sku,
        barcode: items.barcode,
        minStockLevel: items.minStockLevel,
        createdAt: items.createdAt,
        // Override quantity with branch specific inventory
        quantity: sql<string>`COALESCE(${inventory.quantity}, 0)`
    })
        .from(items)
        // Left Join with Inventory for specific Outlet
        .leftJoin(inventory, and(
            eq(inventory.itemId, items.id),
            outletId ? eq(inventory.outletId, outletId) : undefined
        ))
        .where(whereCondition)
        .limit(limit)
        .offset(offset)
        .orderBy(asc(items.name));

    // Map to expected type (quantity number)
    const products = results.map(r => ({
        ...r,
        quantity: Number(r.quantity)
    }));

    // Fetch Total Count
    const allIds = await db.select({ id: items.id }).from(items).where(whereCondition);
    const totalCount = allIds.length;

    return {
        products,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
    };
}

export async function getShiftMetrics(shiftId: string) {
    const db = await getDb();

    if (!shiftId) return { itemsSold: 0, transactionCount: 0, totalRevenue: 0 };

    const txs = await db.query.posTransactions.findMany({
        where: and(eq(posTransactions.shiftId, shiftId), eq(posTransactions.status, "COMPLETED")),
    });

    let itemsSold = 0;
    let totalRevenue = 0;

    txs.forEach(tx => {
        totalRevenue += Number(tx.totalAmount);
        const snapshot = tx.itemsSnapshot as any[] || [];
        snapshot.forEach(item => {
            itemsSold += Number(item.qty || 0);
        });
    });

    return {
        itemsSold,
        transactionCount: txs.length,
        totalRevenue
    };
}

export async function getTopSellingItems(limit = 10) {
    const db = await getDb();
    // Simplified logic: fetch 100 recent transactions and count item occurrences.

    const recentTxs = await db.query.posTransactions.findMany({
        where: eq(posTransactions.status, "COMPLETED"),
        orderBy: [desc(posTransactions.transactionDate)],
        limit: 100
    });

    const frequencyMap = new Map<string, number>();
    recentTxs.forEach(tx => {
        const snapshot = tx.itemsSnapshot as any[] || [];
        snapshot.forEach(i => {
            const count = frequencyMap.get(i.itemId) || 0;
            frequencyMap.set(i.itemId, count + 1); // Count occurrences (transactions per item), or quantity? "Most frequent items being bought" -> Frequency of purchase seems better than just qty for "suggestions"
        });
    });

    // Sort by frequency
    const sortedIds = Array.from(frequencyMap.entries())
        .sort((a, b) => b[1] - a[1]) // Descending count
        .slice(0, limit)
        .map(entry => entry[0]);

    if (sortedIds.length === 0) return [];

    // Fetch Item Details
    const topItems = await db.query.items.findMany({
        where: inArray(items.id, sortedIds)
    });

    return topItems.map(item => ({
        ...item,
        frequency: frequencyMap.get(item.id) || 0
    })).sort((a, b) => b.frequency - a.frequency);
}

export async function getBankAccounts() {
    const db = await getDb();
    // Fetch accounts of type ASSET or BANK (depending on how enum is defined)
    // Assuming 'ASSET' covers banks.
    return await db.query.accounts.findMany({
        // where: eq(accounts.type, "ASSET") // Uncomment if filtering needed
    });
}

export async function getPosBusinessAccounts() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    const db = await getDb();
    return await db.query.businessAccounts.findMany({
        where: eq(businessAccounts.isEnabled, true),
        with: {
            glAccount: true
        }
    });
}

// =========================================
// REFUNDS
// =========================================

export async function refundTransaction(data: {
    shiftId: string;
    originalTransactionId: string;
    items?: { itemId: string; quantity: number }[];
    reason?: string;
}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Validate Shift Context
    const shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.id, data.shiftId),
        columns: { status: true }
    });
    if (!shift || shift.status !== "OPEN") {
        throw new Error("Refunds must be processed within an OPEN shift. Please open a shift first.");
    }

    return await refundTransactionCore(data, user, db);
}

export async function refundTransactionCore(data: {
    shiftId: string;
    originalTransactionId: string;
    items?: { itemId: string; quantity: number }[];
    reason?: string;
}, user: any, db: any, skipRevalidation = false) {

    // 1. Fetch Original
    const originalTx = await db.query.posTransactions.findFirst({
        where: eq(posTransactions.id, data.originalTransactionId),
        with: { payments: true }
    });

    if (!originalTx) throw new Error("Transaction not found");
    if (originalTx.isRefund) throw new Error("Cannot refund a refund");

    const originalItems = originalTx.itemsSnapshot as { itemId: string; qty: number; price: number; name: string }[] || [];

    // Determine Items to Refund
    const itemsToRefund = data.items || originalItems.map(i => ({ itemId: i.itemId, quantity: i.qty }));

    // Prepare for Restock Check - Fetch current item types
    const itemIds = itemsToRefund.map(i => i.itemId);
    const dbItems = await db.select().from(items).where(inArray(items.id, itemIds));
    const dbItemsMap = new Map((dbItems as any[]).map(i => [i.id, i]));

    // Validation
    let refundSubtotal = 0;
    const refundedItemsSnapshot = [];

    for (const refItem of itemsToRefund) {
        const origItem = originalItems.find(i => i.itemId === refItem.itemId);
        if (!origItem) throw new Error(`Item ${refItem.itemId} not in original transaction`);
        if (refItem.quantity > origItem.qty) throw new Error(`Cannot refund more than sold: ${origItem.name}`);

        refundSubtotal += (origItem.price * refItem.quantity);
        refundedItemsSnapshot.push({
            itemId: origItem.itemId,
            name: origItem.name,
            qty: refItem.quantity,
            price: origItem.price
        });
    }

    // Pro-rata calculations
    const originalTotal = Number(originalTx.totalAmount);
    const originalSubtotal = originalItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const ratio = originalSubtotal > 0 ? (refundSubtotal / originalSubtotal) : 0;

    const refundTotalAmount = roundToTwo(originalTotal * ratio);
    const refundTaxAmount = roundToTwo(Number(originalTx.taxAmount) * ratio);
    const refundDiscountAmount = roundToTwo(Number(originalTx.discountAmount) * ratio);
    const refundPointsEarned = roundToTwo(Number(originalTx.loyaltyPointsEarned) * ratio);

    // 2. Create Refund Transaction (Negative Values)
    const [refundTx] = await db.insert(posTransactions).values([{
        shiftId: data.shiftId,
        contactId: originalTx.contactId,
        totalAmount: (-refundTotalAmount).toString(),
        status: "COMPLETED",
        itemsSnapshot: refundedItemsSnapshot,
        transactionDate: new Date(),
        isRefund: true,
        originalTransactionId: originalTx.id,
        discountAmount: (-refundDiscountAmount).toString(),
        taxAmount: (-refundTaxAmount).toString(),
        loyaltyPointsEarned: (-refundPointsEarned).toString(),
        loyaltyPointsRedeemed: "0"
    }]).returning();

    // 3. Record Refund Payment (Cash Out)
    await db.insert(transactionPayments).values({
        transactionId: refundTx.id,
        paymentMethodCode: "CASH",
        amount: (-refundTotalAmount).toString(),
        reference: `Refund for #${originalTx.id.slice(0, 8)}`
    });

    // 4. Restock Inventory (Add back) - ONLY if PHYSICAL
    // Resolve Shift Outlet
    const shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.id, data.shiftId),
        columns: { outletId: true }
    });
    const outletId = shift?.outletId;

    if (outletId) {
        for (const refItem of itemsToRefund) {
            const dbItem = dbItemsMap.get(refItem.itemId);
            if (dbItem && ["RESALE", "MANUFACTURED", "RAW_MATERIAL"].includes(dbItem.itemType)) {
                const result = await db.update(inventory)
                    .set({ quantity: sql`${inventory.quantity} + ${refItem.quantity}` })
                    .where(and(eq(inventory.itemId, refItem.itemId), eq(inventory.outletId, outletId)))
                    .returning();

                if (result.length === 0) {
                    await db.insert(inventory).values({
                        itemId: refItem.itemId,
                        outletId: outletId,
                        quantity: refItem.quantity.toString()
                    });
                }
            }
        }
    }

    // 5. Reverse Loyalty Points
    if (originalTx.contactId && refundPointsEarned > 0) {
        await db.update(contacts)
            .set({ loyaltyPoints: sql`${contacts.loyaltyPoints} - ${refundPointsEarned}` })
            .where(eq(contacts.id, originalTx.contactId));

        // Optional: Ledger entries for loyalty adjustment? Skipping for now.
    }

    // 6. GL POSTING (General Ledger)
    // Refund: Debit Sales Revenue (Decrease Income), Credit Undeposited Funds (Decrease Asset)
    const incomeAccount = await db.query.accounts.findFirst({
        where: eq(accounts.code, "4000")
    });
    const cashAccount = await db.query.accounts.findFirst({
        where: eq(accounts.code, "ACC-ASSET-002") // Undeposited Funds
    });

    if (incomeAccount && cashAccount) {
        const glTxId = crypto.randomUUID();
        // Header
        await db.insert(transactions).values({
            id: glTxId,
            date: new Date(),
            description: `Refund for Sale #${originalTx.id.slice(0, 8)}`,
            status: "POSTED",
            reference: refundTx.id
        });

        const amount = refundTotalAmount.toString();

        // DEBIT Income (Reverse Revenue)
        await db.insert(ledgerEntries).values({
            transactionId: glTxId,
            accountId: incomeAccount.id,
            amount: amount,
            direction: "DEBIT",
            description: "Refund - Revenue Reversal"
        });
        await db.update(accounts).set({
            balance: sql`${accounts.balance} - ${amount}`
        }).where(eq(accounts.id, incomeAccount.id));


        // CREDIT Cash (Reduce Cash)
        await db.insert(ledgerEntries).values({
            transactionId: glTxId,
            accountId: cashAccount.id,
            amount: amount,
            direction: "CREDIT",
            description: "Refund - Cash Payout"
        });
        await db.update(accounts).set({
            balance: sql`${accounts.balance} - ${amount}`
        }).where(eq(accounts.id, cashAccount.id));
    }

    // 7. REVERSE COGS (Cost of Goods Sold)
    // Increase Inventory Asset (Debit 1300), Decrease COGS Expense (Credit 5000)
    let totalRefundedCost = 0;

    itemsToRefund.forEach(item => {
        const dbItem = dbItemsMap.get(item.itemId);
        if (dbItem && ["RESALE", "MANUFACTURED"].includes(dbItem.itemType)) {
            const cost = Number(dbItem.costPrice || 0);
            totalRefundedCost += (cost * item.quantity);
        }
    });

    if (totalRefundedCost > 0) {
        const cogsTxId = crypto.randomUUID();
        const cogsAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "5000") });
        const inventoryAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1300") });

        if (cogsAccount && inventoryAccount) {
            await db.insert(transactions).values({
                id: cogsTxId,
                date: new Date(),
                description: `COGS Reversal for Refund #${refundTx.id.slice(0, 8)}`,
                status: "POSTED",
                reference: refundTx.id,
                metadata: { type: "COGS_REVERSAL", refundTransactionId: refundTx.id }
            });

            // DEBIT INVENTORY (Asset Increase)
            await db.insert(ledgerEntries).values({
                transactionId: cogsTxId,
                accountId: inventoryAccount.id,
                amount: totalRefundedCost.toString(),
                direction: "DEBIT",
                description: "Inventory Restock (Refund)"
            });
            await db.update(accounts).set({ balance: sql`${accounts.balance} + ${totalRefundedCost}` }).where(eq(accounts.id, inventoryAccount.id));

            // CREDIT COGS (Expense Decrease)
            await db.insert(ledgerEntries).values({
                transactionId: cogsTxId,
                accountId: cogsAccount.id,
                amount: totalRefundedCost.toString(),
                direction: "CREDIT",
                description: "COGS Reversal (Refund)"
            });
            await db.update(accounts).set({ balance: sql`${accounts.balance} - ${totalRefundedCost}` }).where(eq(accounts.id, cogsAccount.id));
        }
    }

    if (!skipRevalidation && process.env.IS_SCRIPT !== "true") revalidatePath("/dashboard/business/pos");
    return { success: true, refundId: refundTx.id };
}

// =========================================
// RECONCILIATION ACTIONS
// =========================================

export async function confirmShiftReconciliation(id: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Verify
    const rec = await db.query.shiftReconciliations.findFirst({
        where: eq(shiftReconciliations.id, id)
    });
    if (!rec) throw new Error("Entry not found");

    if (rec.status === "CONFIRMED") return { success: true };

    await db.update(shiftReconciliations)
        .set({ status: "CONFIRMED" })
        .where(eq(shiftReconciliations.id, id));

    // Audit
    await logAuditAction(user.id, "CONFIRM_RECONCILIATION", rec.shiftId, "SHIFT", { reconciliationId: id });
    await updateShiftStatusIfFullyReconciled(rec.shiftId);
    revalidatePath(`/dashboard/business/pos/shifts/${rec.shiftId}`);
    return { success: true };
}

export async function confirmShiftDeposit(id: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Verify
    const dep = await db.query.shiftCashDeposits.findFirst({
        where: eq(shiftCashDeposits.id, id)
    });
    if (!dep) throw new Error("Deposit not found");

    if (dep.status === "CONFIRMED") return { success: true };

    await db.update(shiftCashDeposits)
        .set({
            status: "CONFIRMED",
            reconciledById: user.id,
            reconciledAt: new Date()
        })
        .where(eq(shiftCashDeposits.id, id));

    // GL Posting
    const undepositedFunds = await db.query.accounts.findFirst({
        where: and(eq(accounts.type, "ASSET"), eq(accounts.name, "Undeposited Funds"))
    });

    if (undepositedFunds && dep.accountId) {
        // Create GL Transaction for Deposit
        const [glTx] = await db.insert(transactions).values({
            description: `Shift Deposit - Shift #${dep.shiftId.slice(0, 8)} `,
            status: "POSTED",
            date: new Date(),
            metadata: { type: "DEPOSIT", shiftId: dep.shiftId, depositId: id }
        }).returning();

        // Debit Bank (Asset Increases)
        await db.insert(ledgerEntries).values({
            transactionId: glTx.id,
            accountId: dep.accountId, // Target Bank/Safe
            amount: dep.amount,
            direction: "DEBIT",
            description: `Cash Deposit Confirmed`
        });

        // Credit Undeposited Funds (Asset Decreases)
        await db.insert(ledgerEntries).values({
            transactionId: glTx.id,
            accountId: undepositedFunds.id,
            amount: dep.amount,
            direction: "CREDIT",
            description: `Cash moved from Drawer`
        });

        // Update Balance: Bank (Debit+)
        const bank = await db.query.accounts.findFirst({ where: eq(accounts.id, dep.accountId) });
        if (bank) {
            await db.update(accounts).set({ balance: (Number(bank.balance) + Number(dep.amount)).toString() }).where(eq(accounts.id, dep.accountId));
        }

        // Update Balance: Undeposited (Credit-)
        const undep = await db.query.accounts.findFirst({ where: eq(accounts.id, undepositedFunds.id) });
        if (undep) {
            await db.update(accounts).set({ balance: (Number(undep.balance) - Number(dep.amount)).toString() }).where(eq(accounts.id, undepositedFunds.id));
        }
    }

    // Audit
    await logAuditAction(user.id, "CONFIRM_DEPOSIT", dep.shiftId, "SHIFT", { depositId: id });
    await updateShiftStatusIfFullyReconciled(dep.shiftId);
    revalidatePath(`/dashboard/business/pos/shifts/${dep.shiftId}`);
    return { success: true };
}

async function updateShiftStatusIfFullyReconciled(shiftId: string) {
    const db = await getDb();

    // Check Reconciliations
    const pendingRecs = await db.query.shiftReconciliations.findMany({
        where: and(eq(shiftReconciliations.shiftId, shiftId), eq(shiftReconciliations.status, "PENDING"))
    });

    // Check Deposits
    const pendingDeps = await db.query.shiftCashDeposits.findMany({
        where: and(eq(shiftCashDeposits.shiftId, shiftId), eq(shiftCashDeposits.status, "PENDING"))
    });

    // Check Confirmed Counts (to distinguish Open vs Partial)
    const confirmedRecs = await db.query.shiftReconciliations.findMany({
        where: and(eq(shiftReconciliations.shiftId, shiftId), eq(shiftReconciliations.status, "CONFIRMED"))
    });
    const confirmedDeps = await db.query.shiftCashDeposits.findMany({
        where: and(eq(shiftCashDeposits.shiftId, shiftId), eq(shiftCashDeposits.status, "CONFIRMED"))
    });

    const isFullyReconciled = pendingRecs.length === 0 && pendingDeps.length === 0;
    const isPartial = confirmedRecs.length > 0 || confirmedDeps.length > 0;

    let newStatus = "CLOSED";
    if (isFullyReconciled) newStatus = "RECONCILED";
    else if (isPartial) newStatus = "PARTIALLY_RECONCILED";

    await db.update(posShifts).set({ status: newStatus }).where(eq(posShifts.id, shiftId));
}
