import { getDb } from "@/db";
import { contacts, customerLedgerEntries, posTransactions, posShifts, transactionPayments, ledgerEntries, accounts, businessAccounts, transactions } from "@/db/schema";
import { eq, desc, and, ilike, or, gte, lte, lt, like, sql } from "drizzle-orm";
import { CreateContactDto, AddCustomerBalanceDto } from "@/lib/dtos/crm-dtos";
import { FinanceService } from "./finance-service";

export class CrmService {

    static async getContacts(query?: string) {
        const db = await getDb();
        const searchFilter = query ? or(
            ilike(contacts.name, `%${query}%`),
            ilike(contacts.email, `%${query}%`),
            ilike(contacts.phone, `%${query}%`)
        ) : undefined;

        return await db.query.contacts.findMany({
            where: searchFilter,
            limit: 50,
            orderBy: [desc(contacts.createdAt)]
        });
    }

    static async createContact(data: CreateContactDto) {
        const db = await getDb();
        const [contact] = await db.insert(contacts).values([{
            name: data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            type: data.type,
        }]).returning();
        return contact;
    }

    static async getCustomerLedger(contactId: string, startDate?: Date, endDate?: Date) {
        const db = await getDb();

        const entries = await db.query.customerLedgerEntries.findMany({
            where: and(
                eq(customerLedgerEntries.contactId, contactId),
                startDate ? gte(customerLedgerEntries.entryDate, startDate) : undefined,
                endDate ? lte(customerLedgerEntries.entryDate, endDate) : undefined
            ),
            orderBy: [desc(customerLedgerEntries.entryDate)],
            with: { sale: true, transaction: true }
        });

        // Simulating running balance if needed, but for now returning entries logic from original action
        return entries;
    }

    static async addCustomerBalance(data: AddCustomerBalanceDto, userId: string) {
        const db = await getDb();

        const shift = await db.query.posShifts.findFirst({
            where: and(eq(posShifts.cashierId, userId), eq(posShifts.status, "OPEN"))
        });

        const [tx] = await db.insert(posTransactions).values([{
            shiftId: shift?.id,
            contactId: data.contactId,
            totalAmount: data.amount.toString(),
            status: "COMPLETED",
            itemsSnapshot: [{ itemId: "WALLET", name: "Wallet Deposit", qty: 1, price: data.amount }],
            transactionDate: new Date(),
        }]).returning();

        if (data.method) {
            await db.insert(transactionPayments).values([{
                transactionId: tx.id,
                paymentMethodCode: data.method,
                amount: data.amount.toString(),
                reference: data.notes
            }]);
        }

        const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, data.contactId) });
        const currentBalance = Number(contact?.walletBalance || 0);

        await db.insert(customerLedgerEntries).values([{
            contactId: data.contactId,
            transactionId: tx.id,
            entryDate: new Date(),
            description: data.notes || "Wallet Deposit (Pending)",
            debit: "0",
            credit: data.amount.toString(),
            balanceAfter: currentBalance.toString(),
            status: "PENDING"
        }]);

        return { success: true, pending: true };
    }

    static async confirmWalletDeposit(ledgerId: string, businessAccountId: string, userId: string) {
        const db = await getDb();

        const entry = await db.query.customerLedgerEntries.findFirst({
            where: eq(customerLedgerEntries.id, ledgerId)
        });
        if (!entry) throw new Error("Entry not found");

        const amount = Number(entry.credit);
        const contactId = entry.contactId;

        const businessAccount = await db.query.businessAccounts.findFirst({ where: eq(businessAccounts.id, businessAccountId) });
        if (!businessAccount) throw new Error("Invalid Business Account");
        const targetGlAccountId = businessAccount.glAccountId;

        const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
        const currentBalance = Number(contact?.walletBalance || 0);
        const newBalance = currentBalance + amount;

        await db.update(contacts)
            .set({ walletBalance: newBalance.toString() })
            .where(eq(contacts.id, contactId));

        await db.update(customerLedgerEntries).set({
            status: "CONFIRMED",
            balanceAfter: newBalance.toString(),
            reconciledById: userId,
            reconciledAt: new Date()
        }).where(eq(customerLedgerEntries.id, ledgerId));

        // GL Posting
        if (targetGlAccountId) {
            const [glTx] = await db.insert(transactions).values({
                description: `Wallet Funding - ${contact?.name}`,
                status: "POSTED",
                date: new Date(),
                metadata: { type: "WALLET_FUND", transactionId: entry.transactionId }
            }).returning();

            // Debit Bank
            await db.insert(ledgerEntries).values({
                transactionId: glTx.id,
                accountId: targetGlAccountId,
                amount: amount.toString(),
                direction: "DEBIT",
                description: `Wallet Funding`
            });
            await FinanceService.updateAccountBalance(targetGlAccountId, amount, "DEBIT");

            // Credit Logic
            let remainingAmountToCredit = amount;
            if (currentBalance < 0) {
                const arDebt = Math.abs(currentBalance);
                const amountForAR = Math.min(arDebt, remainingAmountToCredit);

                if (amountForAR > 0) {
                    const arAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1100") });
                    const creditAccount = arAccount || await db.query.accounts.findFirst({ where: eq(accounts.type, "ASSET") });

                    if (creditAccount) {
                        await db.insert(ledgerEntries).values({
                            transactionId: glTx.id,
                            accountId: creditAccount.id,
                            amount: amountForAR.toString(),
                            direction: "CREDIT",
                            description: `Payment Applied to AR`
                        });
                        await FinanceService.updateAccountBalance(creditAccount.id, amountForAR, "CREDIT");
                    }
                    remainingAmountToCredit -= amountForAR;
                }
            }

            if (remainingAmountToCredit > 0) {
                let walletLiabilityAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "2300") });
                if (!walletLiabilityAccount) walletLiabilityAccount = await db.query.accounts.findFirst({ where: and(eq(accounts.type, "LIABILITY"), like(accounts.name, "%Deposit%")) });
                if (!walletLiabilityAccount) walletLiabilityAccount = await db.query.accounts.findFirst({ where: eq(accounts.type, "LIABILITY") });

                if (walletLiabilityAccount) {
                    await db.insert(ledgerEntries).values({
                        transactionId: glTx.id,
                        accountId: walletLiabilityAccount.id,
                        amount: remainingAmountToCredit.toString(),
                        direction: "CREDIT",
                        description: `Wallet Deposit (Prepayment)`
                    });
                    await FinanceService.updateAccountBalance(walletLiabilityAccount.id, remainingAmountToCredit, "CREDIT");
                }
            }
        }
    }
}
