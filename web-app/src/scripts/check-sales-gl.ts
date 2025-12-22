
import { getDb } from "@/db";
import { spQuotes, spSales, transactions, ledgerEntries, customerLedgerEntries, contacts, accounts, users, items } from "@/db/schema";
import { createQuote, convertQuoteToSale, createQuickCustomer, updateQuoteStatus } from "@/actions/sales";
import { eq, desc } from "drizzle-orm";

// Enable Script Mode for Auth Bypass
process.env.IS_SCRIPT = "true";

async function verifySalesGL() {
    console.log("Starting Verification of Sales Pro GL Posting...");
    const db = await getDb();

    // 1. Setup / Cleanup
    const phone = "000TESTGL01";

    // 2. Create Customer & Item
    console.log("Creating/Fetching Test Customer & Item...");
    // Check if exists first to avoid RI errors on cleanup
    let contact = await db.query.contacts.findFirst({
        where: eq(contacts.phone, phone)
    });

    if (!contact) {
        const res = await createQuickCustomer({ name: "GL Test Customer", phone });
        contact = res.contact;
    }

    if (!contact) throw new Error("Failed to get customer");

    const itemId = "ITEM-GL-TEST";
    const existingItem = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!existingItem) {
        await db.insert(items).values({
            id: itemId,
            name: "GL Test Service",
            itemType: "SERVICE",
            price: "1000",
            costPrice: "0",
            category: "General",
        });
    }

    // 3. Create Quote
    console.log("Creating Quote...");
    const { quoteId } = await createQuote({
        contactId: contact.id,
        customerName: contact.name!,
        items: [{ itemId: itemId, itemName: "Consulting Service", quantity: 1, unitPrice: 1000 }], // 1000 + Tax
        validUntil: new Date(),
        deliveryMethod: "PICKUP"
    });
    console.log("Quote Created:", quoteId);

    // 4. Accept Quote
    await updateQuoteStatus(quoteId, "ACCEPTED");
    console.log("Quote Accepted.");

    // 5. Convert to Sale (Triggers GL Logic!)
    console.log("Converting to Sale...");
    const { saleId } = await convertQuoteToSale(quoteId);
    console.log("Sale Created:", saleId);


    // 6. Verify GL
    console.log(`Analyzing Sale #${saleId}...`);

    // Check Transaction
    const tx = await db.query.transactions.findFirst({
        where: eq(transactions.reference, saleId)
    });

    if (!tx) {
        console.error("FAILED: No GL Transaction found for this sale!");
        process.exit(1);
    }
    console.log("SUCCESS: GL Transaction found:", tx.description);

    // Check Ledger Entries
    const entries = await db.query.ledgerEntries.findMany({
        where: eq(ledgerEntries.transactionId, tx.id),
        with: {
            account: true
        }
    });

    console.log("Ledger Entries:");
    entries.forEach(e => {
        console.log(` - ${e.direction} ${e.amount} -> ${e.account.name} (${e.account.code})`);
    });

    // Validations
    const credits = entries.filter(e => e.direction === "CREDIT");
    const debits = entries.filter(e => e.direction === "DEBIT");

    const creditTotal = credits.reduce((sum, e) => sum + Number(e.amount), 0);
    const debitTotal = debits.reduce((sum, e) => sum + Number(e.amount), 0);

    // Filter Revenue
    const revenueEntry = credits.find(e => e.account.code?.includes("INC-SALES") || e.account.name.includes("Revenue"));
    if (!revenueEntry) {
        console.error("FAILED: No Revenue (Income) Account Credited.");
    } else {
        console.log("SUCCESS: Revenue Account Credited.");
    }

    // Filter Receivable
    const receivableEntry = debits.find(e => e.account.name.includes("Receivable") || e.account.type === "ASSET");
    if (!receivableEntry) {
        console.error("FAILED: No Receivable/Asset Account Debited.");
    } else {
        console.log("SUCCESS: Receivable Account Debited.");
    }

    if (Math.abs(creditTotal - debitTotal) > 0.01) {
        console.error(`FAILED: Unbalanced Transaction! Credit: ${creditTotal}, Debit: ${debitTotal}`);
    } else {
        console.log("SUCCESS: Transaction is Balanced.");
    }

    // Check Customer Ledger (Subsidiary)
    const customerLedgerEntry = await db.query.customerLedgerEntries.findFirst({
        where: eq(customerLedgerEntries.saleId, saleId)
    });

    if (customerLedgerEntry) {
        console.log("SUCCESS: Customer Ledger Entry found:");
        console.log(` - Debit: ${customerLedgerEntry.debit}, Balance After: ${customerLedgerEntry.balanceAfter}`);
    } else {
        console.error("FAILED: No Customer Ledger Entry found!");
    }

    // Cleanup
    // await db.delete(spSales).where(eq(spSales.id, saleId)); // Optional
}

verifySalesGL().catch((e) => {
    console.error(e);
    process.exit(1);
});
