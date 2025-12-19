
import { getDb } from "../db";
import { accounts, transactions, ledgerEntries, contacts, customerLedgerEntries } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { addCustomerBalance, confirmWalletDeposit } from "../actions/customer-ledger";

async function main() {
    const db = await getDb();
    console.log("Starting Wallet Flow Verification...");

    // 1. Setup: User, Customer, Account
    const customer = await db.query.contacts.findFirst();
    if (!customer) throw new Error("No customer found");

    const cashAccount = await db.query.accounts.findFirst({
        where: eq(accounts.type, "ASSET")
    });
    if (!cashAccount) throw new Error("No CASH/ASSET account found");

    console.log(`Using Customer: ${customer.name}, Account: ${cashAccount.name}`);

    // 2. Perform Deposit Request (Cash)
    const amount = 5000;
    const { success, pending } = await addCustomerBalance(
        customer.id,
        amount,
        "Test Deposit Script",
        "CASH",
        cashAccount.id // Passing explicit Account ID
    );

    console.log(`Deposit Request: Success=${success}, Pending=${pending}`);

    // 3. Find the Pending Ledger Entry
    const pendingEntry = await db.query.customerLedgerEntries.findFirst({
        where: eq(customerLedgerEntries.status, "PENDING"),
        orderBy: [desc(customerLedgerEntries.entryDate)]
    });

    if (!pendingEntry) throw new Error("Pending Entry not found!");
    console.log(`Found Pending Entry: ${pendingEntry.id}, Credit: ${pendingEntry.credit}`);

    // 4. Confirm Deposit
    await confirmWalletDeposit(pendingEntry.id);
    console.log("Deposit Confirmed via Action.");

    // 5. Verify GL Postings
    // Wallet Liability
    const walletLiability = await db.query.accounts.findFirst({
        where: eq(accounts.name, "Customer Wallets")
    });

    // Check latest GL Transaction
    const glTx = await db.query.transactions.findFirst({
        orderBy: [desc(transactions.date)],
        with: { entries: true }
    });

    console.log(`Latest GL TX: ${glTx?.description}`);
    const debitEntry = glTx?.entries.find(e => e.direction === "DEBIT");
    const creditEntry = glTx?.entries.find(e => e.direction === "CREDIT");

    console.log(`Debit Account: ${debitEntry?.accountId} (Expected: ${cashAccount.id})`);
    console.log(`Credit Account: ${creditEntry?.accountId} (Expected: ${walletLiability?.id})`);

    if (debitEntry?.accountId === cashAccount.id && creditEntry?.accountId === walletLiability?.id) {
        console.log("✅ GL Posting Verified: Cash Debited, Liability Credited.");
    } else {
        console.error("❌ GL Posting Mismatch!");
    }

    // 6. Verify Customer Balance
    const updatedCustomer = await db.query.contacts.findFirst({
        where: eq(contacts.id, customer.id)
    });
    console.log(`Customer New Balance: ${updatedCustomer?.walletBalance}`);
}

main().catch(console.error);
