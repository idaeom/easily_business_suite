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

import { Pagination } from "@/components/Pagination";

export default async function SalesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; limit?: string; view?: string }>;
}) {
    const params = await searchParams;
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const view = params?.view || "list";

    // Quote Pagination Params
    const defaultQuoteLimit = view === "card" ? 5 : 20;
    const quotePage = Number(params?.quotePage) || 1;
    const quoteLimit = Number(params?.quoteLimit) || defaultQuoteLimit;

    const quotes = await getQuotes();
    const salesData = await getSales(page, limit);

    // Sales Metrics (Should ideally be a separate optimized query or aggregation)
    // For now we might need a separate call for totals if getSales is paginated
    // Or we use the total from meta if available, but for revenue sums we need all data or an agg query.
    // Let's assume we keep the metric cards simple or fetch agg data.
    // NOTE: Reducing ONLY visible sales for metrics would be wrong. 
    // We should fetch aggregate metrics separately. For now, let's just fetch all sales for metrics 
    // (This is inefficient but safeguards existing functionality. 
    // Better: create getSalesMetrics action).
    // I'll stick to using the paginated data for display and maybe fetch a simplified "all sales" for metrics or just accept they show page metrics (which is confusing).
    // Let's fetch all for metrics to avoid breaking them.
    // Actually, getSales without args was fetching all. I updated getSales to accept args.
    // I'll add a `getSalesMetrics` call or similar.
    // For now, let's fetch ALL for metrics to be safe, using a large limit or separate call.
    // I'll modify getSales to return metrics? No, logic separation.
    // I'll quickly add `getSalesMetrics` to sales.ts or just invoke getSales with huge limit for metrics (bad practice).
    // Let's rely on what we have. I'll modify `getSales` to return `data` and `meta`. 
    // The metrics at top need *all* sales revenue.
    // I will use `getSalesMetrics` logic if I can, or just fetch all for now in a separate variable.
    // To be clean: I'll invoke getSales(1, 10000) for metrics for now, or better:
    // I'll just skip the metrics update for a second and focus on the list.
    // Wait, if I change `sales` to be paginated results, the `reduce` logic below will be wrong (only 20 items).
    // I must fix this.

    // Quick fix: Fetch all for metrics?
    // Let's assume user wants pagination *for the table*.
    // I'll add `getSalesMetrics` to `sales.ts` in a separate tool call? 
    // Or just inline it here if possible. 
    // Actually `getSales` previously returned everything.
    // I'll fetch `allSales` for metrics and `pagedSales` for list. 
    // To avoid fetching everything twice, I should ideally filter/agg in DB.
    // Time constraint: Fetching all for metrics is acceptable for now if dataset isn't huge.
    // But `getSales` now paginates by default.
    // I'll call `getSales(1, 100000)` for metrics calculation.

    const allSalesResult = await getSales(1, 100000);
    const sales = allSalesResult.data; // For metrics

    const pagedSalesResult = await getSales(page, limit);
    const pagedSales = pagedSalesResult.data;
    const meta = pagedSalesResult.meta;

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
                    <QuotePipeline
                        initialQuotes={quotes}
                        view={view as "list" | "card"}
                        page={quotePage}
                        limit={quoteLimit}
                    />
                </TabsContent>

                <TabsContent value="orders" className="flex-1 mt-4 space-y-4">
                    <SalesList sales={pagedSales} view={view as "list" | "card"} />
                    <Pagination
                        currentPage={meta.page}
                        totalItems={meta.total}
                        pageSize={meta.limit}
                        showViewToggle={true}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

