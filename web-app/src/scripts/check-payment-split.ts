
import { getDb } from "../db";
import { contacts, customerLedgerEntries, accounts, businessAccounts, posTransactions, transactionPayments, ledgerEntries, transactions } from "../db/schema";
import { confirmWalletDeposit } from "../actions/customer-ledger";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("Starting Verification of Payment Split Logic...");
    const db = await getDb();

    // 0. Fetch Valid User
    const user = await db.query.users.findFirst();
    if (!user) process.exit(1);

    // 0.5 Ensure Business Account Exists (Target for Dr)
    let bizAccount = await db.query.businessAccounts.findFirst({ where: eq(businessAccounts.type, "BANK") });
    if (!bizAccount) {
        // Create GL for Bank
        const [bankGL] = await db.insert(accounts).values([{
            code: "1010-TEST",
            name: "Test Bank Account",
            type: "ASSET",
            balance: "0"
        }]).returning();

        const [newBiz] = await db.insert(businessAccounts).values([{
            name: "Test Bank",
            type: "BANK",
            glAccountId: bankGL.id
        }]).returning();
        bizAccount = newBiz;
    }

    // 1. Setup Customer with Negative Balance (DEBT 1000)
    const phone = "08877665544";
    let contact = await db.query.contacts.findFirst({ where: eq(contacts.phone, phone) });
    if (!contact) {
        const [newC] = await db.insert(contacts).values([{
            name: "Payment Split Test Customer",
            phone: phone,
            type: "CUSTOMER",
            walletBalance: "-1000",
            salesRepId: user.id
        }]).returning();
        contact = newC;
    } else {
        await db.update(contacts).set({ walletBalance: "-1000" }).where(eq(contacts.id, contact.id));
        contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contact.id) });
    }
    console.log(`Customer Setup: ${contact!.name}, Balance: ${contact!.walletBalance} (AR Debt)`);

    // TEST A: Partial Payment (300) -> Should ONLY Credit AR
    console.log("\n--- TEST A: Partial Payment (300) ---");
    // Create Pending Ledger Entry
    const [txA] = await db.insert(posTransactions).values([{
        contactId: contact!.id,
        totalAmount: "300",
        status: "COMPLETED",
        transactionDate: new Date()
    }]).returning();

    const [entryA] = await db.insert(customerLedgerEntries).values([{
        contactId: contact!.id,
        transactionId: txA.id,
        entryDate: new Date(),
        description: "Test Partial Payment",
        credit: "300",
        debit: "0",
        balanceAfter: "-700", // Expected
        status: "PENDING"
    }]).returning();

    await confirmWalletDeposit(entryA.id, bizAccount!.id);

    // Verify GL A
    const glTxA = await db.query.transactions.findFirst({
        where: eq(transactions.metadata, { type: "WALLET_FUND", transactionId: txA.id }),
        with: { entries: { with: { account: true } } }
    });

    if (glTxA) {
        console.log("GL Entries A:");
        glTxA.entries.forEach(e => console.log(` - ${e.direction} ${e.amount} -> ${e.account.name} (${e.account.type})`));

        // Expect: Dr Asset 300, Cr AR 300. NO Liability Cdt.
        const arCredit = glTxA.entries.find(e => e.direction === "CREDIT" && e.account.type === "ASSET" && (e.account.code === "1100" || e.account.name.includes("Receivable")));
        const liabCredit = glTxA.entries.find(e => e.direction === "CREDIT" && e.account.type === "LIABILITY");

        if (arCredit && !liabCredit) {
            console.log("SUCCESS A: Correctly Credited AR only.");
        } else {
            console.error("FAILURE A: Incorrect GL Split.");
        }
    }

    // Refresh Contact Balance
    contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contact!.id) });
    console.log(`Balance after A: ${contact!.walletBalance} (Expected -700)`);


    // TEST B: Surplus Payment (900) -> Should Clear AR (700) and Deposit Surplus (200)
    console.log("\n--- TEST B: Surplus Payment (900) ---");
    // Current Debt is 700. Payment 900.
    // Expect: Cr AR 700, Cr Liability 200.

    const [txB] = await db.insert(posTransactions).values([{
        contactId: contact!.id,
        totalAmount: "900",
        status: "COMPLETED",
        transactionDate: new Date()
    }]).returning();

    const [entryB] = await db.insert(customerLedgerEntries).values([{
        contactId: contact!.id,
        transactionId: txB.id,
        entryDate: new Date(),
        description: "Test Surplus Payment",
        credit: "900",
        debit: "0",
        balanceAfter: "200", // Expected
        status: "PENDING"
    }]).returning();

    await confirmWalletDeposit(entryB.id, bizAccount!.id);

    // Verify GL B
    const glTxB = await db.query.transactions.findFirst({
        // Note: Drizzle JSONB comparison might be tricky equality, but works on exact match usually or use logic
        // Let's rely on finding by description or recent? No, metadata check usually works if exact.
        where: eq(transactions.metadata, { type: "WALLET_FUND", transactionId: txB.id }),
        with: { entries: { with: { account: true } } }
    });

    if (glTxB) {
        console.log("GL Entries B:");
        glTxB.entries.forEach(e => console.log(` - ${e.direction} ${e.amount} -> ${e.account.name} (${e.account.type})`));

        const arCredit = glTxB.entries.find(e => e.direction === "CREDIT" && e.account.type === "ASSET");
        const liabCredit = glTxB.entries.find(e => e.direction === "CREDIT" && e.account.type === "LIABILITY");

        if (arCredit && liabCredit) {
            console.log(`SUCCESS B: Split! Cr AR: ${arCredit.amount}, Cr Liability: ${liabCredit.amount}`);
            if (Number(arCredit.amount) === 700 && Number(liabCredit.amount) === 200) {
                console.log("Amounts are PERFECT.");
            } else {
                console.error(`FAILURE B Details: Expected 700/200. Got ${arCredit.amount}/${liabCredit.amount}`);
            }
        } else {
            console.error("FAILURE B: Did not split correctly.");
        }
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
