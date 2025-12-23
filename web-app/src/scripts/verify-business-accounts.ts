
import { getBusinessAccounts } from "@/actions/finance";
import { getDb } from "@/db";


async function main() {
    process.env.IS_SCRIPT = "true";
    console.log("🔍 Verifying Business Account GL Links...");

    // We need to bypass the auth check in getBusinessAccounts if we can't mock successfully in script context without jest
    // Actually, I modified auth.ts to support IS_SCRIPT. 
    // BUT getBusinessAccounts calls getAuthenticatedUser().

    const accounts = await getBusinessAccounts();

    console.log(`Found ${accounts.length} Business Accounts:`);
    accounts.forEach(acc => {
        console.log(`- ${acc.name} (Type: ${acc.type})`);
        console.log(`  -> Linked GL: ${acc.glAccount?.name} [${acc.glAccount?.code}]`);
        console.log(`  -> GL ID: ${acc.glAccountId}`);
        console.log(`  -> Balance: ${acc.glAccount?.balance}`);
    });
}

main().catch(console.error);
