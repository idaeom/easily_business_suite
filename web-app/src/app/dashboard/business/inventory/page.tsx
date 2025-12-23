
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getItems, getVendors, getRequisitions, getTransfers, getOutlets } from "@/actions/inventory";
import { getItemCategories } from "@/actions/setup-categories";
import { ItemMaster } from "@/components/inventory/ItemMaster";
import { VendorList } from "@/components/inventory/VendorList";
import RequisitionBoard from "@/components/inventory/RequisitionBoard";
import GrnReceiving from "@/components/inventory/GrnReceiving";
import { StockTransferBoard } from "@/components/inventory/StockTransferBoard";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { getAuthenticatedUser } from "@/lib/auth";

interface InventoryPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InventoryPage(props: InventoryPageProps) {
    const searchParams = await props.searchParams;
    // Determine active Outlet Filter (default to GLOBAL)
    const activeOutletFilter = typeof searchParams.outletId === 'string' ? searchParams.outletId : "GLOBAL";

    // Parallel Data Fetching
    const [items, vendors, requisitions, categories, transfers, outlets, currentUser] = await Promise.all([
        getItems(undefined, activeOutletFilter),
        getVendors(),
        getRequisitions(),
        getItemCategories(),
        getTransfers(),
        getOutlets(),
        getAuthenticatedUser()
    ]);

    const userRole = currentUser?.role || "USER";
    const currentOutletId = currentUser?.outletId || outlets[0]?.id; // Default to first outlet if not set

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inventory Pro</h2>
                    <p className="text-muted-foreground">Manage stock, suppliers, and procurement.</p>
                </div>
                <div className="flex gap-2">
                    {/* Global Adjustment Button */}
                    <StockAdjustmentDialog items={items as any[]} outletId={currentOutletId} />
                </div>
            </div>

            <Tabs defaultValue="items" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="items">Item Master</TabsTrigger>
                    <TabsTrigger value="vendors">Vendor Center</TabsTrigger>
                    <TabsTrigger value="procurement">Requisitions</TabsTrigger>
                    <TabsTrigger value="receiving">Goods Receiving</TabsTrigger>
                    <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="space-y-4">
                    <ItemMaster
                        items={items as any[]}
                        categories={categories}
                        outlets={outlets}
                        activeOutletId={activeOutletFilter}
                    />
                </TabsContent>

                <TabsContent value="vendors" className="space-y-4">
                    <VendorList vendors={vendors as any[]} />
                </TabsContent>

                <TabsContent value="procurement" className="space-y-4">
                    <div className="flex flex-col space-y-4">
                        <div className="bg-slate-50 border rounded-lg p-4">
                            <h3 className="font-semibold text-sm mb-2">Procurement Workflow</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>1. Create Request</span>
                                <span>→</span>
                                <span>2. Approval</span>
                                <span>→</span>
                                <span>3. Pay Vendor</span>
                                <span>→</span>
                                <span>4. Receive Goods (GRN)</span>
                            </div>
                        </div>
                        <RequisitionBoard data={requisitions as any[]} userRole={userRole} />
                    </div>
                </TabsContent>

                <TabsContent value="receiving" className="space-y-4">
                    <GrnReceiving requests={requisitions as any[]} />
                </TabsContent>

                <TabsContent value="transfers" className="space-y-4">
                    <StockTransferBoard
                        transfers={transfers as any[]}
                        outlets={outlets as any[]}
                        items={items as any[]}
                        currentOutletId={currentOutletId}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
