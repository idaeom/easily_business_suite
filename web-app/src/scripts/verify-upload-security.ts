
import { validateFileBuffer } from '@/lib/server/file-validation';
import { saveSecureFile } from '@/lib/server/secure-storage';
import { rm } from 'fs/promises';
import { join } from 'path';

async function testSecurity() {
    console.log("🛡️ Starting Security Verification...");

    const errors: string[] = [];

    // Test 1: Valid File
    console.log("\n--- Test 1: Valid PNG Upload ---");
    const validPng = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"); // Magic number for PNG
    const validRes = await validateFileBuffer(validPng);
    if (!validRes.isValid || validRes.mime !== 'image/png') {
        errors.push("❌ Valid PNG rejected or misidentified");
        console.error("Failed: Valid PNG", validRes);
    } else {
        console.log("✅ Valid PNG accepted");
    }

    // Test 2: Invalid File (Fake PDF -> actually EXE)
    console.log("\n--- Test 2: Invalid Extension Spoofing (EXE as PDF) ---");
    const fakePdf = Buffer.from("4d5a90000300000004000000ffff0000", "hex"); // Magic number for EXE (MZ)
    const invalidRes = await validateFileBuffer(fakePdf);
    if (invalidRes.isValid) {
        errors.push("❌ EXE file accepted as valid! (Major Security Flaw)");
        console.error("Failed: EXE accepted", invalidRes);
    } else {
        console.log("✅ EXE file rejected correctly");
    }

    // Test 3: Valid PDF
    console.log("\n--- Test 3: Valid PDF Upload ---");
    const validPdf = Buffer.from("255044462d312e35", "hex"); // %PDF-1.5
    const pdfRes = await validateFileBuffer(validPdf);
    if (pdfRes.isValid && pdfRes.mime === 'application/pdf') {
        console.log("✅ Valid PDF accepted");
    } else {
        errors.push("❌ Valid PDF rejected");
        console.error("Failed: PDF rejected", pdfRes);
    }

    // Test 4: Storage Path
    console.log("\n--- Test 4: Storage Path Security ---");
    try {
        const saved = await saveSecureFile(validPng, "logo.png", "image/png");
        if (saved.absolutePath.includes("public")) {
            errors.push("❌ File saved in public directory!");
        } else {
            console.log("✅ File saved in private storage: " + saved.absolutePath);
            // Cleanup
            await rm(saved.absolutePath);
        }
    } catch (e) {
        errors.push("❌ Storage test failed with error: " + e);
    }

    if (errors.length > 0) {
        console.error("\n❌ Verification Failed with errors:");
        errors.forEach(e => console.error(e));
        process.exit(1);
    } else {
        console.log("\n✅ All Security Tests Passed!");
        process.exit(0);
    }
}

testSecurity().catch(console.error);
