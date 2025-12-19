
import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { users, employeeProfiles, teams } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const db = await getDb();
        const dbUrl = process.env.DATABASE_URL || "NOT_SET";
        const maskedUrl = dbUrl.replace(/:[^:]+@/, ":***@");

        console.log("Debug DB Request:", { maskedUrl });

        // 1. Check Column Existence Directly
        const checkCol = await db.execute(sql`SELECT "pfaName" FROM "EmployeeProfile" LIMIT 1`);
        const colExists = true;

        // 2. Run the EXACT failing query (Left Join)
        const rows = await db.select({
            user: users,
            profile: employeeProfiles,
            team: teams
        })
            .from(users)
            .leftJoin(employeeProfiles, eq(users.id, employeeProfiles.userId))
            .leftJoin(teams, eq(users.teamId, teams.id))
            .limit(1);

        return NextResponse.json({
            status: "ok",
            maskedUrl,
            colExists,
            sampleRow: rows[0]
        });
    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            error: error.message,
            stack: error.stack,
            cause: error.cause,
            maskedUrl: (process.env.DATABASE_URL || "").replace(/:[^:]+@/, ":***@")
        }, { status: 500 });
    }
}
