
import React from 'react';
import { getCustomer, getCustomerLedger } from "@/actions/crm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Download, Wallet, Plus } from "lucide-react";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { CreateQuoteDialog } from "@/components/sales/CreateQuoteDialog";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const customer = await getCustomer(id);
    const ledger = await getCustomerLedger(id);

    if (!customer) return <div>Customer not found</div>;

    const balance = Number(customer.walletBalance || 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/business/customers">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
                    <p className="text-slate-500">{customer.phone} • {customer.email}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <CreateQuoteDialog initialCustomer={{ id: customer.id, name: customer.name, phone: customer.phone }}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Quote
                        </Button>
                    </CreateQuoteDialog>

                    {/* Actions like Edit, Statement */}
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Statement
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${balance < 0 ? "text-red-500" : "text-green-600"}`}>
                            ₦{balance.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {balance < 0 ? "Outstanding Debt" : "Prepaid Credit"}
                        </p>
                    </CardContent>
                </Card>
                {/* Add more stats like Total Sales, Last Sale Date */}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Ledger</CardTitle>
                    <CardDescription>Transaction history and account activity</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-3 text-left font-medium">Date</th>
                                    <th className="p-3 text-left font-medium">Description</th>
                                    <th className="p-3 text-right font-medium text-red-600">Debit (Dr)</th>
                                    <th className="p-3 text-right font-medium text-green-600">Credit (Cr)</th>
                                    <th className="p-3 text-right font-medium">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                            No ledger entries found.
                                        </td>
                                    </tr>
                                )}
                                {ledger.map((entry) => (
                                    <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-3">
                                            {format(entry.entryDate, "MMM d, yyyy")}
                                            <div className="text-xs text-muted-foreground">{format(entry.entryDate, "h:mm a")}</div>
                                        </td>
                                        <td className="p-3">
                                            {entry.description}
                                            {entry.saleId && (
                                                <Badge variant="outline" className="ml-2 text-[10px]">
                                                    Sales Pro
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-3 text-right font-mono text-red-600">
                                            {Number(entry.debit) > 0 ? `-₦${Number(entry.debit).toLocaleString()}` : "-"}
                                        </td>
                                        <td className="p-3 text-right font-mono text-green-600">
                                            {Number(entry.credit) > 0 ? `+₦${Number(entry.credit).toLocaleString()}` : "-"}
                                        </td>
                                        <td className="p-3 text-right font-mono font-medium">
                                            ₦{Math.abs(Number(entry.balanceAfter)).toLocaleString()}
                                            <span className="text-xs text-muted-foreground ml-1">
                                                {Number(entry.balanceAfter) < 0 ? "DR" : "CR"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
