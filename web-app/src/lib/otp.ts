import { getDb } from "@/db";
import { verificationTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

export class OtpService {
    /**
     * Generates a secure OTP, hashes it, and stores it.
     * Returns the RAW token (to be sent to user).
     */
    static async generateOtp(identifier: string): Promise<string> {
        // 1. Generate the raw token
        const rawToken = crypto.randomInt(100000, 999999).toString();

        // 2. Hash it immediately (Security Best Practice)
        const hashedToken = await bcrypt.hash(rawToken, 10);

        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 3. Use a Transaction for Atomicity
        const db = await getDb();
        await db.transaction(async (tx) => {
            // Delete old tokens
            await tx.delete(verificationTokens)
                .where(eq(verificationTokens.identifier, identifier));

            // Save the HASH, not the raw token
            await tx.insert(verificationTokens).values({
                identifier,
                token: hashedToken, // Storing hash
                expires,
            });
        });

        // In production, send 'rawToken' via Email/SMS. 
        // NEVER log this in production.
        console.log(`[OTP] Generated for ${identifier}: ${rawToken}`);

        return rawToken;
    }

    /**
     * Verifies the OTP against the stored hash.
     * Consumes the token upon success.
     */
    static async verifyOtp(identifier: string, inputToken: string): Promise<boolean> {
        // 1. Find the record by IDENTIFIER only (we can't search by hash directly yet)
        // We also check expiry here to filter out old tokens early
        const db = await getDb();
        const records = await db.select()
            .from(verificationTokens)
            .where(and(
                eq(verificationTokens.identifier, identifier),
                gt(verificationTokens.expires, new Date())
            ));

        const record = records[0];

        if (!record) return false;

        // 2. Verify the Hash
        const isValid = await bcrypt.compare(inputToken, record.token);

        if (!isValid) return false;

        // 3. Consume token (Atomic Delete)
        // We use the ID and Token to verify we are deleting what we just checked
        const result = await db.delete(verificationTokens)
            .where(and(
                eq(verificationTokens.identifier, identifier),
                eq(verificationTokens.token, record.token)
            ))
            .returning({ deletedId: verificationTokens.identifier });

        // If nothing was returned, another request consumed it 1ms ago.
        return result.length > 0;
    }
}
