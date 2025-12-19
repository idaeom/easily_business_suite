import { getDb } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AuditService } from "@/lib/audit";
import { sanitizeHtml } from "@/lib/sanitizer";
import { OtpService } from "@/lib/otp";

async function main() {
    const db = await getDb();
    console.log("Starting Security Verification...");

    // 1. Test Input Sanitization
    console.log("\n1. Testing Input Sanitization...");
    const maliciousInput = "Hello <script>alert('XSS')</script><b>World</b>";
    const sanitized = sanitizeHtml(maliciousInput);
    if (sanitized === "Hello <b>World</b>") {
        console.log("✅ Sanitization Passed: Script tag removed.");
    } else {
        console.error(`❌ Sanitization Failed: Got '${sanitized}'`);
    }

    // 2. Test Audit Logging
    console.log("\n2. Testing Audit Logging...");
    const user = await db.query.users.findFirst();
    if (user) {
        await AuditService.log(user.id, "TEST_ACTION", "System", "123", { details: "Test Details" });
        const logs = await db.query.auditLogs.findMany({
            where: eq(auditLogs.action, "TEST_ACTION"),
            orderBy: [desc(auditLogs.createdAt)],
            limit: 1
        });
        if (logs.length > 0 && logs[0].userId === user.id) {
            console.log("✅ Audit Logging Passed: Log entry found.");
        } else {
            console.error("❌ Audit Logging Failed: Log entry not found.");
        }
    } else {
        console.warn("⚠️ Skipping Audit Log test: No user found.");
    }

    // 3. Test OTP Generation & Verification
    console.log("\n3. Testing OTP...");
    const identifier = "test@example.com";
    const token = await OtpService.generateOtp(identifier);
    console.log(`Generated OTP: ${token}`);

    const isValid = await OtpService.verifyOtp(identifier, token);
    if (isValid) {
        console.log("✅ OTP Verification Passed.");
    } else {
        console.error("❌ OTP Verification Failed.");
    }

    const isReused = await OtpService.verifyOtp(identifier, token);
    if (!isReused) {
        console.log("✅ OTP Replay Protection Passed (Token consumed).");
    } else {
        console.error("❌ OTP Replay Protection Failed (Token reused).");
    }

    console.log("\nSecurity Verification Completed.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
