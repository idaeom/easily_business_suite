import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyRole } from "@/lib/auth";

export default async function AuditLogsPage() {
    await verifyRole(["ADMIN", "MANAGER"]);

    const db = await getDb();
    const logs = await db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userName: users.name
    })
        .from(auditLogs)
        .innerJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
                <p className="text-muted-foreground">
                    Audit trail of authorized actions (Last 100).
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>{log.createdAt.toLocaleString()}</TableCell>
                                    <TableCell className="font-medium">{log.userName}</TableCell>
                                    <TableCell>{log.action}</TableCell>
                                    <TableCell>{log.entityType}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono max-w-[300px] truncate">
                                        {JSON.stringify(log.details)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
