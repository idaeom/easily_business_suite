import { getDb } from "@/db";
import { teams, teamMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AuditService } from "@/lib/audit";

export class TeamService {
    /**
     * Helper: Check if a user is a Leader of the team
     */
    private static async verifyLeaderRole(teamId: string, userId: string) {
        // 1. First, check if they are a Global Admin (Super User)
        const db = await getDb();
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { role: true }
        });
        if (user?.role === "ADMIN") return true;

        // 2. If not, check if they are a LEADER of this specific team
        const membership = await db.query.teamMembers.findFirst({
            where: and(
                eq(teamMembers.teamId, teamId),
                eq(teamMembers.userId, userId)
            ),
            columns: { role: true }
        });

        if (membership?.role === "LEADER") return true;

        throw new Error("Unauthorized: Only Team Leaders can manage members.");
    }

    static async createTeam(name: string, description: string | undefined, type: "TEAM" | "DEPARTMENT" | "UNIT", creatorUserId: string) {
        const db = await getDb();
        return db.transaction(async (tx) => {
            const [team] = await tx.insert(teams).values({
                name,
                description,
                type,
            }).returning();

            await tx.insert(teamMembers).values({
                teamId: team.id,
                userId: creatorUserId,
                role: "LEADER",
            });

            await AuditService.log(creatorUserId, "CREATE_TEAM", "Team", team.id, { name }, tx);
            return team;
        });
    }

    static async addMember(teamId: string, targetUserId: string, role: string = "MEMBER", actorUserId: string) {
        // 1. SECURITY CHECK (The missing piece)
        await this.verifyLeaderRole(teamId, actorUserId);

        const db = await getDb();
        return db.transaction(async (tx) => {
            // 2. Check for Duplicates (Graceful Handling)
            const existing = await tx.query.teamMembers.findFirst({
                where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId))
            });

            if (existing) {
                throw new Error("User is already a member of this team.");
            }

            // 3. Add Member
            const [member] = await tx.insert(teamMembers).values({
                teamId,
                userId: targetUserId,
                role,
            }).returning();

            await AuditService.log(actorUserId, "ADD_TEAM_MEMBER", "Team", teamId, {
                addedUser: targetUserId,
                role
            }, tx);

            return member;
        });
    }

    static async removeMember(teamId: string, targetUserId: string, actorUserId: string) {
        await this.verifyLeaderRole(teamId, actorUserId);

        // Prevent a Leader from removing themselves (Orphaning the team)
        // Logic: If I am the LAST leader, I cannot leave.
        if (targetUserId === actorUserId) {
            const db = await getDb();
            const leaders = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, "LEADER")));
            if (leaders.length === 1) throw new Error("You must assign another Leader before leaving.");
        }

        const db = await getDb();
        return db.transaction(async (tx) => {
            await tx.delete(teamMembers)
                .where(and(
                    eq(teamMembers.teamId, teamId),
                    eq(teamMembers.userId, targetUserId)
                ));

            await AuditService.log(actorUserId, "REMOVE_TEAM_MEMBER", "Team", teamId, { removedUser: targetUserId }, tx);
        });
    }

    // Getters remain the same...
    static async getTeam(teamId: string) {
        const db = await getDb();
        return db.query.teams.findFirst({
            where: eq(teams.id, teamId),
            with: {
                members: { with: { user: true } },
                projects: true, // Assuming relation exists
            },
        });
    }

    static async getUserTeams(userId: string) {
        const db = await getDb();
        return db.query.teamMembers.findMany({
            where: eq(teamMembers.userId, userId),
            with: { team: true },
        });
    }
}
