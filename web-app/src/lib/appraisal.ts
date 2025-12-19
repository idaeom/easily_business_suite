
import { getDb } from "@/db";
import { appraisals, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export type CreateAppraisalInput = {
    userId: string;
    reviewerId: string;
    rating: number; // Legacy or calculated
    feedback: string;
    period: string;
    // New KPI fields
    kpis?: { name: string; score: number }[];
};

export class AppraisalService {
    static async createAppraisal(input: CreateAppraisalInput) {
        const db = await getDb();

        let objectiveScore = null;
        let hrComment = null;
        let derivedScore = input.rating;

        // Intelligent Processing
        if (input.kpis && input.kpis.length > 0) {
            // 1. Calculate Average (1-10 scale)
            const sum = input.kpis.reduce((acc, k) => acc + k.score, 0);
            const avg = sum / input.kpis.length;
            objectiveScore = avg.toFixed(2);

            // 2. Draft Report based on Objective Score
            hrComment = AppraisalService.generateDraftReport(input.kpis, avg);

            // 3. Map 10-scale to 5-scale for legacy compatibility if needed, or just store raw
            // Mapping 1-10 to 1-5:
            derivedScore = Math.round(avg / 2);
            if (derivedScore < 1) derivedScore = 1;
        }

        const [appraisal] = await db.insert(appraisals).values({
            userId: input.userId,
            reviewerId: input.reviewerId,
            score: derivedScore,
            comments: input.feedback, // Manager's raw feedback
            period: input.period,
            status: "PENDING_CERTIFICATION",
            kpis: input.kpis || [],
            objectiveScore: objectiveScore ? objectiveScore.toString() : null,
            hrComment: hrComment
        }).returning();
        return appraisal;
    }

    private static generateDraftReport(kpis: { name: string; score: number }[], avg: number): string {
        let tone = "Neutral";
        if (avg >= 8) tone = "Highly Positive";
        else if (avg >= 6) tone = "Positive";
        else if (avg >= 4) tone = "Constructive";
        else tone = "Critical";

        const summary = `Employee Name: [Name]\nPeriod: [Period]\n\nOverall Performance Score: ${avg.toFixed(1)}/10\n\nPerformance Summary:\nBased on the assessed KPIs, the employee has demonstrated a performance level that is ${tone}.\n\nStrengths:\n${kpis.filter(k => k.score >= 8).map(k => `- ${k.name} (${k.score}/10)`).join('\n') || "No specific high-performance areas noted."}\n\nAreas for Improvement:\n${kpis.filter(k => k.score <= 5).map(k => `- ${k.name} (${k.score}/10)`).join('\n') || "No significant performance gaps identified."}\n\nTraining Recommendations:\n[Intelligent suggestion based on weak KPIs]`;

        return summary;
    }

    static async getAppraisalsForUser(userId: string) {
        const db = await getDb();
        return db.query.appraisals.findMany({
            where: eq(appraisals.userId, userId),
            orderBy: [desc(appraisals.createdAt)],
            with: { reviewer: true }
        });
    }

    static async getAllAppraisals() {
        const db = await getDb();
        return db.query.appraisals.findMany({
            orderBy: [desc(appraisals.createdAt)],
            with: {
                user: true,
                reviewer: true
            }
        });
    }

    static async getPendingAppraisals() {
        const db = await getDb();
        const { inArray } = await import("drizzle-orm");
        return db.query.appraisals.findMany({
            where: inArray(appraisals.status, ["PENDING_CERTIFICATION", "PENDING_APPROVAL"]),
            orderBy: [desc(appraisals.createdAt)],
            with: {
                user: true,
                reviewer: true
            }
        });
    }

    static async certifyAppraisal(id: string, certifierId: string) {
        const db = await getDb();
        const [updated] = await db.update(appraisals)
            .set({ status: "PENDING_APPROVAL", certifierId })
            .where(eq(appraisals.id, id))
            .returning();
        return updated;
    }

    static async approveAppraisal(id: string, approverId: string) {
        const db = await getDb();
        const [updated] = await db.update(appraisals)
            .set({ status: "APPROVED", approverId })
            .where(eq(appraisals.id, id))
            .returning();
        return updated;
    }

    static async rejectAppraisal(id: string, rejectorId: string) {
        const db = await getDb();
        const [updated] = await db.update(appraisals)
            .set({ status: "REJECTED" }) // Maybe store rejectorId?
            .where(eq(appraisals.id, id))
            .returning();
        return updated;
    }
}
