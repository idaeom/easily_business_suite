
import { PERMISSIONS } from "@/lib/permissions-constants";

async function main() {
    console.log("🔒 Verifying RBAC Configuration...");

    // 1. Check Permission Keys
    const permissionKeys = Object.keys(PERMISSIONS);
    console.log(`✅ Found ${permissionKeys.length} Permission Keys defined.`);

    // 2. Verify Critical Permissions Existence
    const criticalPermissions = [
        "POS_ACCESS", "MANAGE_INVENTORY", "VIEW_FINANCE", "MANAGE_EMPLOYEES",
        "PAYROLL_CREATE", "MANAGE_USERS", "MANAGE_SETTINGS"
    ];

    const missing = criticalPermissions.filter(p => !PERMISSIONS[p as keyof typeof PERMISSIONS]);

    if (missing.length > 0) {
        console.error("❌ Missing Critical Permissions:", missing);
        process.exit(1);
    } else {
        console.log("✅ All Critical Permission Keys detected.");
    }

    console.log("\n✅ RBAC Config Verified Successfully.");
}

main().catch(console.error);
