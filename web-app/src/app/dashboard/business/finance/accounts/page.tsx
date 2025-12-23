import { getBusinessAccounts, getGlAccounts } from "@/actions/finance";
import { AccountDialog } from "@/components/finance/AccountDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Building2, Wallet, Banknote } from "lucide-react";

export default async function AccountsPage() {
    const accounts = await getBusinessAccounts();
    const glAccounts = await getGlAccounts();

    const getIcon = (type: string) => {
        switch (type) {
            case "BANK": return <Building2 className="w-4 h-4 text-blue-500" />;
            case "MOMO": return <Wallet className="w-4 h-4 text-orange-500" />;
            default: return <Banknote className="w-4 h-4 text-green-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business Accounts</h1>
                    <p className="text-muted-foreground">
                        Manage profiles for cash drawers, bank accounts, and mobile money wallets.
                    </p>
                </div>
                <AccountDialog glAccounts={glAccounts} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Accounts</CardTitle>
                    <CardDescription>
                        These profiles are used to simplify GL posting for your cashiers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>Linked GL Account</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No accounts found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell>{getIcon(account.type)}</TableCell>
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell>{account.type}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {/* @ts-ignore - glAccount is joined */}
                                            {account.glAccount?.balance ? (
                                                <span className={Number(account.glAccount.balance) <= 0 ? "text-red-500" : ""}>
                                                    ₦{Number(account.glAccount.balance).toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {/* @ts-ignore - Relation populated by drizzle query */}
                                            {account.glAccount ? (
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {/* @ts-ignore */}
                                                        {account.glAccount.code}
                                                    </span>
                                                    {/* @ts-ignore */}
                                                    <span>{account.glAccount.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-red-500 text-xs">Unlinked</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 flex-wrap">
                                                {account.usage?.map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="text-xs">
                                                        {tag.replace("_", " ")}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={account.isEnabled ? "outline" : "destructive"}>
                                                {account.isEnabled ? "Active" : "Disabled"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AccountDialog account={account} glAccounts={glAccounts} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
