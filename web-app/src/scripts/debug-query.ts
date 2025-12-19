
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Debugging failing query...");
    const db = await getDb();

    const query = `
        select "budgets"."id", "budgets"."categoryId", "budgets"."amount", "budgets"."startDate", "budgets"."endDate", "budgets"."createdAt", "budgets"."updatedAt", "budgets_category"."data" as "category" 
        from "Budget" "budgets" 
        left join lateral (
            select json_build_array("budgets_category"."id", "budgets_category"."name", "budgets_category"."description", "budgets_category"."createdAt", "budgets_category"."updatedAt") as "data" 
            from (
                select * from "ExpenseCategory" "budgets_category" 
                where "budgets_category"."id" = "budgets"."categoryId" 
                limit $1
            ) "budgets_category"
        ) "budgets_category" on true 
        order by "budgets"."createdAt" desc
    `;

    try {
        const result = await db.execute(sql.raw(query.replace(/\$1/g, '1'))); // Replace param for raw execution or pass it if supported
        console.log("Query success!");
        console.log("Rows:", result.rows);
    } catch (error) {
        console.error("Query failed!");
        console.error(error);
    } finally {
        process.exit(0);
    }
}

main();
