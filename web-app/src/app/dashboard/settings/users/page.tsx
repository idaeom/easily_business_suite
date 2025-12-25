import { getUsers } from "@/actions/user-actions";
import { getDb } from "@/db";
import { outlets } from "@/db/schema";
import { InviteUserDialog } from "@/components/settings/InviteUserDialog";
import { UsersTable } from "@/components/settings/UsersTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyRole } from "@/lib/auth";
import { UserFilters } from "@/components/settings/UserFilters";
import { Pagination } from "@/components/Pagination";

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }> // Next.js 15+ searchParams is a Promise
}) {
    // Only Admin can see this page
    await verifyRole(["ADMIN"]);

    const params = await searchParams;
    const page = Number(params.page) || 1;
    const search = params.search as string || "";
    const role = params.role as string || "";

    const { data: users, meta } = await getUsers({ page, limit: 10, search, role });

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

            <UserFilters />

            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                        A list of all users authorized to access the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UsersTable users={users as any} outlets={allOutlets} />
                    <div className="mt-4">
                        <Pagination
                            currentPage={meta.page}
                            totalItems={meta.total}
                            pageSize={meta.limit}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
