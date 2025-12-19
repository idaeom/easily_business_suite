
import { getDb } from "@/db";
import { users, employeeProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import EmployeeForm from "@/components/hr/EmployeeForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const db = await getDb();

    const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
            employeeProfile: true,
            // We can't easily fetch 'profileChangeRequests' relation here if it's not defined in schema relations yet?
            // I defined 'profileChangeRequests' table but maybe not the relation in 'usersRelations'.
            // Let's check schema.ts relation definitions.
        }
    });

    // Fetch pending request manually if relation missing or just to be safe
    const { profileChangeRequests } = await import("@/db/schema");
    const { desc, and, inArray } = await import("drizzle-orm");
    const pendingRequest = await db.query.profileChangeRequests.findFirst({
        where: and(
            eq(profileChangeRequests.userId, id),
            inArray(profileChangeRequests.status, ["PENDING_CERTIFICATION", "PENDING_APPROVAL"])
        ),
        orderBy: [desc(profileChangeRequests.createdAt)]
    });

    if (!user) {
        notFound();
    }

    // Cast user permissions to array if strictly needed by types, 
    // but here we just pass 'user' to the form which expects a basic structure.

    // Fetch Comments if Pending Request exists
    let comments: any[] = [];
    if (pendingRequest) {
        const { CollaborationService } = await import("@/lib/collaboration");
        comments = await CollaborationService.getProfileRequestComments(pendingRequest.id);
    }

    // Dynamic import for client components in server component? No, regular import.
    // But HRComments is a generic component I just made.
    const { HRComments } = await import("@/components/hr/HRComments");

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Manage Employee Profile</h2>

            <Card>
                <CardHeader>
                    <CardTitle>Profile Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmployeeForm user={user} pendingRequest={pendingRequest} />
                </CardContent>
            </Card>

            {pendingRequest && (
                <Card>
                    <CardHeader>
                        <CardTitle>Communication</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <HRComments requestId={pendingRequest.id} comments={comments} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
