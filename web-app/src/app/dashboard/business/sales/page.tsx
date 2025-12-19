import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getQuotes, getSales } from "@/actions/sales";
import { QuotePipeline } from "@/components/sales/QuotePipeline";
import { SalesList } from "@/components/sales/SalesList";
import { CreateQuoteDialog } from "@/components/sales/CreateQuoteDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SalesPage() {
    const quotes = await getQuotes();
    const sales = await getSales();

    const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total), 0);
    const potentialRevenue = quotes.reduce((acc, q) => acc + (q.status === 'ACCEPTED' ? Number(q.total) : 0), 0);
    const activeQuotes = quotes.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Sales Pro</h2>
                <div className="flex gap-2">
                    <Link href="/dashboard/business/sales/customers">
                        <Button variant="outline">Customers</Button>
                    </Link>
                    <Link href="/dashboard/business/sales/reports">
                        <Button variant="outline">Reports</Button>
                    </Link>
                    <CreateQuoteDialog>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Quote
                        </Button>
                    </CreateQuoteDialog>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 shrink-0">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Confirmed Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {sales.length} Orders
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Potential Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{potentialRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            From accepted quotes
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Pipeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeQuotes}</div>
                        <p className="text-xs text-muted-foreground">
                            Drafts & Sent
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="pipeline" className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="pipeline">Quote Pipeline</TabsTrigger>
                        <TabsTrigger value="orders">Orders & History</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="pipeline" className="flex-1 mt-4">
                    <QuotePipeline initialQuotes={quotes} />
                </TabsContent>

                <TabsContent value="orders" className="flex-1 mt-4">
                    <SalesList sales={sales} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

