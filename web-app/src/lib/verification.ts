import { PaystackService } from "./paystack";
import { SquadcoService } from "./squadco";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export class VerificationService {
    /**
     * Resolves an account number using Squadco first, then falls back to Paystack.
     * This ensures high availability and leverages the preferred provider (Squadco) by default.
     */
    static async resolveAccount(accountNumber: string, bankCode: string) {
        console.log(`[Verification] Resolving ${accountNumber} @ ${bankCode}...`);

        // 1. Try Squadco (Preferred)
        let squadcoBankName = "";
        try {
            const db = await getDb();
            const squadcoAccount = await db.query.accounts.findFirst({
                where: eq(accounts.provider, "SQUADCO")
            });
            const squadcoSecret = (squadcoAccount?.credentials as any)?.secretKey || process.env.SQUADCO_SECRET_KEY;

            // Get bank name for potential fallback
            const squadcoBanks = await SquadcoService.getBanks();
            const bank = squadcoBanks.find(b => b.code === bankCode);
            if (bank) squadcoBankName = bank.name;

            if (squadcoSecret) {
                const squadcoResult = await SquadcoService.resolveAccount(accountNumber, bankCode, squadcoSecret);
                if (squadcoResult) {
                    console.log(`[Verification] Resolved via Squadco: ${squadcoResult.account_name}`);
                    return {
                        account_name: squadcoResult.account_name,
                        account_number: squadcoResult.account_number,
                        bank_id: -1 // Squadco doesn't return bank_id
                    };
                }
            } else {
                console.warn("[Verification] Squadco secret not found, skipping to Paystack.");
            }
        } catch (error) {
            console.error("[Verification] Squadco resolution failed:", error);
        }

        // 2. Fallback to Paystack
        console.log("[Verification] Falling back to Paystack...");
        try {
            // We need to find the Paystack Bank Code corresponding to the Squadco Bank Name
            // because the codes differ (e.g. GTB: Squadco 000013 vs Paystack 058)
            let paystackBankCode = bankCode; // Default to same code if no match found (unlikely to work but safe default)

            if (squadcoBankName) {
                const paystackBanks = await PaystackService.getBanks();
                // Fuzzy match or exact match on name
                // Normalize names: remove "Plc", "Bank", "Limited", etc for better matching
                const normalize = (name: string) => name.toLowerCase().replace(/plc|bank|limited|ltd|of nigeria/g, "").trim();

                const targetName = normalize(squadcoBankName);
                const match = paystackBanks.find(b => normalize(b.name) === targetName || normalize(b.name).includes(targetName) || targetName.includes(normalize(b.name)));

                if (match) {
                    console.log(`[Verification] Mapped Squadco bank '${squadcoBankName}' to Paystack bank '${match.name}' (${match.code})`);
                    paystackBankCode = match.code;
                } else {
                    console.warn(`[Verification] Could not map Squadco bank '${squadcoBankName}' to Paystack.`);
                }
            }

            const paystackResult = await PaystackService.resolveAccount(accountNumber, paystackBankCode);
            if (paystackResult) {
                console.log(`[Verification] Resolved via Paystack: ${paystackResult.account_name}`);
                return paystackResult;
            }
        } catch (error) {
            console.error("[Verification] Paystack resolution failed:", error);
        }

        return null;
    }

    /**
     * Returns a list of banks.
     * Uses Squadco's list as the master directory for UI since it's the primary provider.
     */
    static async getBanks() {
        return SquadcoService.getBanks();
    }
}
