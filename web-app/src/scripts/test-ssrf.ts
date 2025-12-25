import { isUrlSafe } from '../lib/security/ssrf';
import { safeFetch } from '../lib/security/safe-fetch';

async function runTests() {
    console.log("🛡️ Starting SSRF Protection Tests...\n");

    const tests = [
        { url: 'https://google.com', expected: true, desc: 'Public Domain (Google)' },
        { url: 'http://127.0.0.1', expected: false, desc: 'Localhost IP (127.0.0.1)' },
        { url: 'http://localhost', expected: false, desc: 'Localhost Hostname' },
        { url: 'http://10.0.0.5', expected: false, desc: 'Private IP (10.x.x.x)' },
        { url: 'http://192.168.1.1', expected: false, desc: 'Private IP (192.168.x.x)' },
        { url: 'http://169.254.169.254', expected: false, desc: 'AWS Metadata Service' },
        { url: 'ftp://example.com', expected: false, desc: 'Invalid Protocol (FTP)' },
    ];

    console.log("--- 1. URL Safety Check (isUrlSafe) ---");
    for (const t of tests) {
        const result = await isUrlSafe(t.url);
        const pass = result === t.expected;
        const icon = pass ? '✅' : '❌';
        console.log(`${icon} ${t.desc}: ${t.url} -> Safe? ${result} (Expected: ${t.expected})`);
    }

    console.log("\n--- 2. Safe Fetch Execution (safeFetch) ---");

    // Test 1: Real Fetch (Should Pass)
    try {
        console.log("Testing Safe Fetch to https://example.com...");
        const res = await safeFetch('https://example.com');
        console.log(`✅ Success: Status ${res.status}`);
    } catch (e) {
        console.log(`❌ Failed: ${e}`);
    }

    // Test 2: Blocked Fetch (Should Fail)
    try {
        console.log("Testing Safe Fetch to http://127.0.0.1...");
        await safeFetch('http://127.0.0.1');
        console.log(`❌ Failed: Request should have been blocked!`);
    } catch (e: any) {
        console.log(`✅ Success (Blocked): ${e.message}`);
    }

    // Test 3: Allow List Mode
    try {
        console.log("Testing Allow List (only allow google.com)...");
        const options = { allowList: ['google.com'] };
        // Should Fail
        await safeFetch('https://example.com', {}, options);
        console.log(`❌ Failed: Request to example.com should have been blocked.`);
    } catch (e: any) {
        console.log(`✅ Success (Blocked not in allowlist): ${e.message}`);
    }
}

runTests();
