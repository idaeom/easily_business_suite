
import { getAllEmployees } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function EmployeesPage() {
    const employees = await getAllEmployees();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
                {/* In a real app, "Add Employee" usually means inviting a user first, then setting up profile. 
                     For now, we list existing Users and allow "Setup Profile". */}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Staff Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Job Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map((user) => {
                                const profile = user.employeeProfile;
                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{profile?.jobTitle || "-"}</TableCell>
                                        <TableCell>
                                            {profile?.employmentType ? (
                                                <Badge variant="outline">{profile.employmentType}</Badge>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {profile ? (
                                                <Badge className="bg-green-500">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">No Profile</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dashboard/hr/employees/${user.id}`}>
                                                <Button size="sm" variant="ghost">
                                                    {profile ? "Edit" : "Setup"}
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
