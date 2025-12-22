
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { CreateAccountDialog } from "@/components/CreateAccountDialog";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

import { StandardCOAWizard } from "@/components/StandardCOAWizard";

async function getAccounts() {
    const db = await getDb();
    return db.query.accounts.findMany({
        orderBy: [asc(accounts.code)],
    });
}

export default async function AccountsPage() {
    const allAccounts = await getAccounts();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
                <div className="flex gap-2">
                    <StandardCOAWizard />
                    <CreateAccountDialog />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Financial Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Currency</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allAccounts.map((account) => (
                                <TableRow key={account.id}>
                                    <TableCell className="font-medium">{account.code}</TableCell>
                                    <TableCell>
                                        <HoverCard>
                                            <HoverCardTrigger asChild>
                                                <span className="cursor-help underline decoration-dotted underline-offset-4 decoration-gray-300 hover:decoration-gray-500 transition-all">
                                                    {account.name}
                                                </span>
                                            </HoverCardTrigger>
                                            <HoverCardContent className="w-80">
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-semibold">{account.name}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {account.description || "No description available for this account."}
                                                    </p>
                                                    <div className="flex items-center pt-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            Type: {account.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            </HoverCardContent>
                                        </HoverCard>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{account.type}</Badge>
                                    </TableCell>
                                    <TableCell>{account.currency}</TableCell>
                                </TableRow>
                            ))}
                            {allAccounts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                        No accounts found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
