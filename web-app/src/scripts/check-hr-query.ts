
import { getDb } from "../db";
import { employeeProfiles, users, teams } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Testing HR Query (Left Join)...");
    try {
        const db = await getDb();
        const rows = await db.select({
            user: users,
            profile: employeeProfiles,
            team: teams
        })
            .from(users)
            .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
            .leftJoin(teams, eq(users.teamId, teams.id));

        console.log(`Success! Fetched ${rows.length} rows.`);
        if (rows.length > 0) {
            const pfaName = rows[0].profile?.pfaName;
            console.log("Sample PFA Name:", pfaName);
        }
    } catch (e: any) {
        console.error("Query Failed!", e);
        if (e.cause) console.error("Cause:", e.cause);
    }
    process.exit(0);
}
main();
