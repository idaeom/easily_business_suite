
import { getDb } from "@/db";
import { accounts, contacts, shifts, shiftCashDeposits, shiftReconciliations, posTransactions, transactionPayments, ledgerEntries, users, items, customerLedgerEntries, transactions, outlets } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { confirmWalletDeposit } from "@/actions/customer-ledger";
import { confirmShiftDeposit, confirmShiftReconciliation } from "@/actions/pos";

async function runTest() {
    console.log("Starting Reconciliation Flow Test...");
    const db = await getDb();

    // 0. Cleanup Test Data
    console.log("Cleaning up previous test data...");
    try {
        await db.delete(customerLedgerEntries).where(eq(customerLedgerEntries.id, "LED-WAL-001"));
        await db.delete(transactionPayments).where(sql`"transactionId" IN ('TX-WAL-001', 'TX-SALE-001')`);
        await db.delete(posTransactions).where(sql`"id" IN ('TX-WAL-001', 'TX-SALE-001')`);
        await db.delete(shiftCashDeposits).where(eq(shiftCashDeposits.id, "DEP-SHIFT-001"));
        await db.delete(shifts).where(eq(shifts.id, "SHIFT-TEST-001"));

        // Delete GL Data
        const glDescriptions = sql`"description" LIKE 'Wallet Funding%' OR "description" LIKE 'Sale Revenue%' OR "description" LIKE 'Shift Deposit Confirmed%' OR "description" LIKE 'Sale Cash%'`;
        const headerDescriptions = sql`"description" LIKE 'Wallet Funding%' OR "description" LIKE 'Sale Revenue%' OR "description" LIKE 'Shift Deposit Confirmed%'`;

        await db.delete(ledgerEntries).where(glDescriptions);
        await db.delete(transactions).where(headerDescriptions);
    } catch (e) {
        console.warn("Cleanup warning:", e);
    }

    // 2. Seed Accounts & Map IDs
    console.log("Seeding Accounts...");
    const accountSeeds = [
        { id: "ACC-BANK-001", name: "Zenith Bank", type: "ASSET", code: "1001", balance: "1000000" },
        { id: "ACC-CASH-001", name: "Cash in Drawer", type: "ASSET", code: "1002", balance: "0" },
        { id: "ACC-UNDEP-001", name: "Undeposited Funds", type: "ASSET", code: "1003", balance: "0" },
        { id: "ACC-LIAB-WAL", name: "Customer Wallets", type: "LIABILITY", code: "2001", balance: "0" },
        { id: "ACC-REV-SALE", name: "Sales Revenue", type: "INCOME", code: "4001", balance: "0" }
    ];

    const idMap = new Map<string, string>();
    const getAccId = (testId: string) => idMap.get(testId) || testId;

    for (const acc of accountSeeds) {
        const existing = await db.query.accounts.findFirst({ where: eq(accounts.code, acc.code) });
        if (existing) {
            // Update existing to match test requirements (e.g. balance reset? maybe not reset balance to preserve state if shared, but for test we want predictable)
            // Let's Force Reset Balance for Test
            await db.update(accounts).set({
                name: acc.name,
                type: acc.type as any,
                balance: acc.balance
            }).where(eq(accounts.id, existing.id));
            idMap.set(acc.id, existing.id);
        } else {
            await db.insert(accounts).values({ ...acc, type: acc.type as any });
            idMap.set(acc.id, acc.id);
        }
    }

    // 2. Seed Customer
    console.log("Seeding Customer...");
    const customerId = "CUST-TEST-001";
    await db.insert(contacts).values({
        id: customerId,
        name: "Test Customer",
        type: "CUSTOMER",
        email: "test@example.com",
        walletBalance: "0"
    }).onConflictDoUpdate({ target: contacts.id, set: { walletBalance: "0" } }); // Reset balance

    // 3. Seed Items
    await db.insert(items).values({
        id: "ITEM-TEST-001",
        name: "Test Widget",
        price: "1000",
        costPrice: "800",
        quantity: "100",
        itemType: "RESALE",
        category: "GENERAL"
    }).onConflictDoNothing();

    const BANK_ID = getAccId("ACC-BANK-001");
    const UNDEP_ID = getAccId("ACC-UNDEP-001");
    const WALLET_LIAB_ID = getAccId("ACC-LIAB-WAL");
    const REV_ID = getAccId("ACC-REV-SALE");

    // ==========================================
    // TEST CASE A: Wallet Funding (Bank Transfer)
    // ==========================================
    console.log("\n--- TEST A: Wallet Funding ---");

    // Simulate "Add Balance" Action (Manually doing parts of addCustomerBalance to verify flow)
    // We'll use the actual action but we need to mock Auth.
    // Since we are running as script, we can't easily mock `getAuthenticatedUser` unless we mock the module.
    // Instead, let's manually insert the Pending State that `addCustomerBalance` would create.

    const walletTxId = "TX-WAL-001";
    await db.insert(posTransactions).values({
        id: walletTxId,
        contactId: customerId,
        totalAmount: "5000",
        status: "COMPLETED",
        transactionDate: new Date(),
        itemsSnapshot: [{ itemId: "WALLET", name: "Wallet Deposit", qty: 1, price: 5000 }]
    }).onConflictDoNothing();

    await db.insert(transactionPayments).values({
        transactionId: walletTxId,
        paymentMethodCode: "TRANSFER",
        amount: "5000",
        accountId: BANK_ID, // Customer paid into Zenith
        reference: "Ref-001"
    }).onConflictDoNothing();

    const ledgerId = "LED-WAL-001";
    await db.insert(customerLedgerEntries).values({
        id: ledgerId,
        contactId: customerId,
        transactionId: walletTxId,
        entryDate: new Date(),
        description: "Wallet Deposit (Pending)",
        credit: "5000",
        debit: "0",
        balanceAfter: "0",
        status: "PENDING"
    }).onConflictDoNothing();

    console.log("Created Pending Wallet Deposit. Confirming...");

    // Mock User for Action? Use `reconciledById` manually if action fails due to auth.
    // We can't call server action `confirmWalletDeposit` easily without Auth context.
    // Let's Simulate the Action Logic:

    // ACTION LOGIC SIMULATION
    const entry = await db.query.customerLedgerEntries.findFirst({ where: eq(customerLedgerEntries.id, ledgerId) });
    if (entry && entry.status === "PENDING") {
        // Update Wallet
        await db.update(contacts).set({ walletBalance: "5000" }).where(eq(contacts.id, customerId));
        // Update Ledger
        await db.update(customerLedgerEntries).set({ status: "CONFIRMED", balanceAfter: "5000" }).where(eq(customerLedgerEntries.id, ledgerId));

        // GL POSTING (The new part)
        const [glTx] = await db.insert(transactions).values({
            description: `Wallet Funding`,
            status: "POSTED",
            date: new Date(),
            metadata: { type: "WALLET_FUND" }
        }).returning();

        await db.insert(ledgerEntries).values({
            transactionId: glTx.id,
            accountId: BANK_ID,
            amount: "5000",
            direction: "DEBIT",
            description: "Wallet Funding"
        });
        await db.insert(ledgerEntries).values({
            transactionId: glTx.id,
            accountId: WALLET_LIAB_ID,
            amount: "5000",
            direction: "CREDIT",
            description: "Wallet Funding"
        });

        // Update Account Balances
        await db.execute(sql`UPDATE "Account" SET balance = balance + 5000 WHERE id = ${BANK_ID}`); // Asset Debit +
        await db.execute(sql`UPDATE "Account" SET balance = balance + 5000 WHERE id = ${WALLET_LIAB_ID}`); // Liability Credit +

        console.log("Wallet Deposit Confirmed & GL Posted.");
    }

    // Verify Balances
    const bankVal = await db.query.accounts.findFirst({ where: eq(accounts.id, BANK_ID) });
    const liabVal = await db.query.accounts.findFirst({ where: eq(accounts.id, WALLET_LIAB_ID) });
    const custVal = await db.query.contacts.findFirst({ where: eq(contacts.id, customerId) });

    console.log(`Bank Balance (Expected 1005000): ${bankVal?.balance}`);
    console.log(`Wallet Liab (Expected 5000): ${liabVal?.balance}`);
    console.log(`Customer Wallet (Expected 5000): ${custVal?.walletBalance}`);


    // ==========================================
    // TEST CASE B: Sales Flow & Shift Reconciliation
    // ==========================================
    // 3c. Seed User (Cashier)
    await db.insert(users).values({
        id: "USER-001",
        email: "cashier@example.com",
        password: "hash",
        role: "USER",
        name: "Test Cashier"
    }).onConflictDoNothing();


    // 3b. Seed Outlet
    const outletId = "OUTLET-001";
    // Need to import `outlets` first. Assuming it's in schema.
    await db.insert(outlets).values({
        id: outletId,
        name: "Test Outlet",
        address: "123 Test St",
        phone: "08012345678"
    }).onConflictDoNothing();

    const shiftId = "SHIFT-TEST-001";
    // Create Shift
    await db.insert(shifts).values({
        id: shiftId,
        cashierId: "USER-001", // Assume exists or doesn't matter for query
        outletId: "OUTLET-001",
        startTime: new Date(),
        status: "OPEN",
        startCash: "0"
    }).onConflictDoNothing();

    // Create Sale (Cash)
    const saleTxId = "TX-SALE-001";
    const saleAmount = 2000;

    // In a real sale, we should ideally Debit "Undeposited Funds" (Cash in Drawer) and Credit Revenue immediately?
    // Or do we do it at shift close?
    // Logic: Sales happen -> Cash Accumulates in Drawer (Asset).
    // Ledger: Debit "Cash in Drawer", Credit "Sales Revenue".

    // Let's simulate this "Sale" GL posting first (assuming the system does it on sale creation, which we haven't modified yet, but assuming we want to test RECONCILIATION moving it).
    // Let's assume the "Undeposited Funds" account IS the "Cash in Drawer" for GL purposes?

    // Simulate Sale Event Logic:
    await db.insert(posTransactions).values({
        id: saleTxId,
        shiftId: shiftId,
        totalAmount: saleAmount.toString(),
        status: "COMPLETED",
        transactionDate: new Date(),
        itemsSnapshot: []
    }).onConflictDoNothing();

    // Payment (Cash)
    await db.insert(transactionPayments).values({
        transactionId: saleTxId,
        paymentMethodCode: "CASH",
        amount: saleAmount.toString()
    }).onConflictDoNothing();

    // 1. Post Revenue (Manual Sim)
    const [revGlTx] = await db.insert(transactions).values({
        description: `Sale Revenue`,
        status: "POSTED",
        date: new Date()
    }).returning();

    await db.insert(ledgerEntries).values([
        { transactionId: revGlTx.id, accountId: UNDEP_ID, amount: saleAmount.toString(), direction: "DEBIT", description: "Sale Cash" },
        { transactionId: revGlTx.id, accountId: REV_ID, amount: saleAmount.toString(), direction: "CREDIT", description: "Sale Revenue" }
    ]);

    await db.execute(sql`UPDATE "Account" SET balance = balance + ${saleAmount} WHERE id = ${UNDEP_ID}`); // Asset Debit +
    await db.execute(sql`UPDATE "Account" SET balance = balance + ${saleAmount} WHERE id = ${REV_ID}`); // Income Credit +

    console.log("Sale Recorded. Cash in Undeposited Funds.");

    // 2. End Shift & Cash Drop
    // Cashier declares 2000 cash. Drops it to Safe (or Bank via Deposit).
    // We create a ShiftCashDeposit.

    const depositId = "DEP-SHIFT-001";
    await db.insert(shiftCashDeposits).values({
        id: depositId,
        shiftId: shiftId,
        amount: saleAmount.toString(),
        status: "PENDING",
        accountId: BANK_ID, // Deposited to Zenith
        // createdAt is defaultNow() used as declaredAt
        // createdAt is defaultNow() used as declaredAt
    }).onConflictDoNothing();

    console.log("Shift Deposit Created (Pending). Reconciling...");

    // 3. Reconcile (Manager Action Simulation)
    // Trigger `confirmShiftDeposit` logic
    const dep = await db.query.shiftCashDeposits.findFirst({ where: eq(shiftCashDeposits.id, depositId) });
    if (dep && dep.status === "PENDING") {
        // Update Status
        await db.update(shiftCashDeposits).set({ status: "CONFIRMED" }).where(eq(shiftCashDeposits.id, depositId));

        // GL POSTING (The new part from pos.ts)
        // Debit: Bank
        // Credit: Undeposited Funds
        const [depGlTx] = await db.insert(transactions).values({
            description: `Shift Deposit Confirmed`,
            status: "POSTED",
            date: new Date()
        }).returning();

        await db.insert(ledgerEntries).values({
            transactionId: depGlTx.id, // Using deposit ID as Tx ID for GL grouping
            accountId: BANK_ID,
            amount: saleAmount.toString(),
            direction: "DEBIT",
            description: "Shift Deposit Confirmed"
        });
        await db.insert(ledgerEntries).values({
            transactionId: depGlTx.id,
            accountId: UNDEP_ID,
            amount: saleAmount.toString(),
            direction: "CREDIT",
            description: "Shift Deposit Confirmed"
        });

        // Update Balances
        await db.execute(sql`UPDATE "Account" SET balance = balance + ${saleAmount} WHERE id = ${BANK_ID}`); // Asset Debit +
        await db.execute(sql`UPDATE "Account" SET balance = balance - ${saleAmount} WHERE id = ${UNDEP_ID}`); // Asset Credit -

        console.log("Shift Deposit Confirmed & GL Posted.");
    }

    // Verify Final Balances
    const bankVal2 = await db.query.accounts.findFirst({ where: eq(accounts.id, BANK_ID) });
    const undepVal = await db.query.accounts.findFirst({ where: eq(accounts.id, UNDEP_ID) });
    const revVal = await db.query.accounts.findFirst({ where: eq(accounts.id, REV_ID) });

    console.log(`\nFinal Results:`);
    console.log(`Bank (Expected 1007000): ${bankVal2?.balance}`); // 1M + 5000 (Wallet) + 2000 (Shift)
    console.log(`Undeposited (Expected 0): ${undepVal?.balance}`); // 2000 In - 2000 Out
    console.log(`Revenue (Expected 2000): ${revVal?.balance}`);

    process.exit(0);
}

runTest().catch(console.error);
