
import fs from "fs";
import path from "path";

const routes = [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/business/sales",
    "/dashboard/business/inventory",
    "/dashboard/business/operations",
    "/dashboard/business/pos",
    "/dashboard/finance",
    "/dashboard/expenses",
    "/dashboard/budgets",
    "/dashboard/reports",
    "/dashboard/hr",
    "/dashboard/expenses",
    "/dashboard/business/operations",
    "/dashboard/tasks",
    "/dashboard/settings/users"
];

const appDir = path.join(process.cwd(), "src/app");

console.log("Verifying Routes...");

routes.forEach(route => {
    // Construct path to page.tsx
    const pagePath = path.join(appDir, route, "page.tsx");
    if (fs.existsSync(pagePath)) {
        console.log(`✅ FOUND: ${route}`);
    } else {
        console.log(`❌ MISSING: ${route} (Expected at: ${pagePath})`);
    }
});
