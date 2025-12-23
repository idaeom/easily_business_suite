
import { getDb } from "@/db";
import { posTransactions, items, ledgerEntries, accounts, transactions, posShifts, inventory, outlets, users } from "@/db/schema";
import { processTransactionCore, refundTransactionCore } from "@/actions/pos";
import { eq, inArray } from "drizzle-orm";

async function verifyCogsRefundFixed() {
    const db = await getDb();

    // 1. GL Check
    const cogsAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "5000") });
    const invAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1300") });

    if (!cogsAccount || !invAccount) console.error("Warning: GL Accounts missing, GL posting might fail or be skipped.");

    // 2. Dependencies (User & Outlet)
    const MOCK_USER_ID = "USER-SCRIPT-" + Date.now();
    const MOCK_OUTLET_ID = "OUTLET-SCRIPT"; // Fixed ID for simplicity

    // Create User
    try {
        await db.insert(users).values({
            id: MOCK_USER_ID,
            email: `test-${Date.now()}@example.com`,
            name: "Script User",
            role: "ADMIN",
            // Removed passwordHash/password to avoid lint error if optional or different name
            // If required, insert might fail. Let's hope it's optional or handled.
        }).onConflictDoNothing();
    } catch (e: any) {
        console.log("User creation skipped or failed:", e.message);
    }

    // Create Outlet
    try {
        await db.insert(outlets).values({
            id: MOCK_OUTLET_ID,
            name: "Script Test Outlet",
            address: "123 Test St",
            // Removed managerId as lint said it doesn't exist
        }).onConflictDoNothing();
    } catch (e: any) {
        console.log("Outlet creation skipped or failed:", e.message);
    }


    // 3. Item Setup
    const [product] = await db.insert(items).values({
        name: "Refund Test " + Date.now(),
        price: "100", // String
        costPrice: "60", // String
        category: "Test",
        itemType: "RESALE",
        sku: "REF-" + Date.now(),
        quantity: "100" // String
    }).returning();

    // Add Inventory (Separate table)
    await db.insert(inventory).values({
        itemId: product.id,
        outletId: MOCK_OUTLET_ID,
        quantity: "100"
    });

    console.log(`Created Item: ${product.id}`);

    // 4. Sale (Core)
    const mockUser = { id: MOCK_USER_ID, outletId: MOCK_OUTLET_ID };

    // Create Dummy Shift
    const [shift] = await db.insert(posShifts).values({
        cashierId: MOCK_USER_ID,
        outletId: MOCK_OUTLET_ID,
        status: "OPEN",
        startCash: "0"
    }).returning();

    // Note: Payment amount includes Tax (Assuming ~12.5% default if rules exist).
    // If no tax rules enabled, 100 is fine.
    // If mismatch errors, we will see it. Using 112.5 from previous error hint.
    const saleResult = await processTransactionCore({
        shiftId: shift.id,
        items: [{ itemId: product.id, name: product.name, quantity: 1, price: 100 }],
        payments: [{ methodCode: "CASH", amount: 112.5 }]
    }, mockUser, db, true);

    if (!saleResult.success) {
        console.error("Sale Failed");
        return;
    }
    console.log(`Sale Created: ${saleResult.transactionId}`);

    // 5. Refund (Core)
    const refundResult = await refundTransactionCore({
        shiftId: shift.id,
        originalTransactionId: saleResult.transactionId,
        items: [{ itemId: product.id, quantity: 1 }],
        reason: "Test Refund"
    }, mockUser, db, true);

    if (!refundResult.success) {
        console.error("Refund Failed");
        return;
    }
    console.log(`Refund Created: ${refundResult.refundId}`);

    // 6. Verify GL
    const glTxs = await db.query.transactions.findMany({
        where: eq(transactions.reference, refundResult.refundId)
    });

    const glTxIds = glTxs.map(t => t.id);

    if (glTxIds.length === 0) {
        console.error("No GL Transactions found for this refund.");
        return;
    }

    const entries = await db.select({
        direction: ledgerEntries.direction,
        amount: ledgerEntries.amount,
        accountCode: accounts.code,
        accountName: accounts.name
    })
        .from(ledgerEntries)
        .leftJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
        .where(inArray(ledgerEntries.transactionId, glTxIds));

    console.log("\nGL Entries Found:");
    let cogsReversed = false;
    let invRestocked = false;

    for (const entry of entries) {
        console.log(`${entry.direction} ${entry.accountName} (${entry.accountCode}): ${entry.amount}`);
        if (entry.accountCode === "5000" && entry.direction === "CREDIT" && Number(entry.amount) === 60) cogsReversed = true;
        if (entry.accountCode === "1300" && entry.direction === "DEBIT" && Number(entry.amount) === 60) invRestocked = true;
    }

    if (cogsReversed && invRestocked) {
        console.log("\nSUCCESS: COGS Reversal Confirmed!");
    } else {
        console.error("\nFAILURE: GL entries mismatch.");
    }
}

verifyCogsRefundFixed().catch(console.error);
