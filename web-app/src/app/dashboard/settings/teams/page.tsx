import { getTeams } from "@/app/actions";
import { CreateTeamDialog } from "@/components/CreateTeamDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default async function TeamsPage() {
    const teams = await getTeams();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
                <CreateTeamDialog />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team: any) => (
                    <Card key={team.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {team.name}
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    {team.type}
                                </span>
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{team.members.length} Members</div>
                            <p className="text-xs text-muted-foreground">
                                {team.description || "No description"}
                            </p>
                            <div className="mt-4 text-xs text-muted-foreground">
                                {team.projects.length} Active Projects
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {teams.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No teams found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
