import { getUsers } from "@/actions/user-actions";
import { getDb } from "@/db";
import { outlets } from "@/db/schema";
import { InviteUserDialog } from "@/components/settings/InviteUserDialog";
import { UsersTable } from "@/components/settings/UsersTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyRole } from "@/lib/auth";

export default async function UsersPage() {
    // Only Admin can see this page (Double check, although Middleware handles it)
    await verifyRole(["ADMIN"]);

    const users = await getUsers();
    const db = await getDb();
    const allOutlets = await db.select({ id: outlets.id, name: outlets.name }).from(outlets);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
                    <p className="text-muted-foreground">
                        Manage system access, roles, and permissions.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <InviteUserDialog outlets={allOutlets} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                        A list of all users authorized to access the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable users={users as any} outlets={allOutlets} />
                </CardContent>
            </Card>
        </div>
    );
}
