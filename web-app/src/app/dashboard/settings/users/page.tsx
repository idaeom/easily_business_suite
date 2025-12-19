import { getDb } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateUserDialog } from "@/components/CreateUserDialog";

import { teams } from "@/db/schema";

async function getUsers() {
    const db = await getDb();
    return db.query.users.findMany({
        orderBy: [asc(users.name)],
        with: {
            team: true, // Fetch assigned team
        }
    });
}

async function getTeams() {
    const db = await getDb();
    return db.query.teams.findMany({
        orderBy: [asc(teams.name)],
    });
}

import { getAuthenticatedUser } from "@/lib/auth";
import { UserRoleSelect } from "@/components/UserRoleSelect";

import { redirect } from "next/navigation";

import { UserPermissionsSelect } from "@/components/UserPermissionsSelect";

export default async function UsersPage(props: { searchParams: Promise<{ newUser?: string }> }) {
    const searchParams = await props.searchParams;
    const allUsers = await getUsers();
    const allTeams = await getTeams();
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <CreateUserDialog teams={allTeams} defaultOpen={searchParams?.newUser === 'true'} />
            </div>

            <div className="grid gap-4">
                {allUsers.map((user: any) => (
                    <Card key={user.id}>
                        <CardContent className="flex items-center justify-between p-6">
                            <div className="flex items-center space-x-4">
                                <Avatar>
                                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium leading-none">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <UserRoleSelect
                                    userId={user.id}
                                    currentRole={user.role}
                                    currentUserId={currentUser.id}
                                />
                                <UserPermissionsSelect
                                    userId={user.id}
                                    currentPermissions={user.permissions || []}
                                    currentUserId={currentUser.id}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
