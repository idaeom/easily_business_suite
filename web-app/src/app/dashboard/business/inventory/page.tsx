
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getItems, getVendors, getRequisitions } from "@/actions/inventory";
import { ItemMaster } from "@/components/inventory/ItemMaster";
import { VendorList } from "@/components/inventory/VendorList";
import RequisitionBoard from "@/components/inventory/RequisitionBoard";
import GrnReceiving from "@/components/inventory/GrnReceiving";

export default async function InventoryPage() {
    // Parallel Data Fetching
    // Parallel Data Fetching
    const [items, vendors, requisitions] = await Promise.all([
        getItems(),
        getVendors(),
        getRequisitions()
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inventory Pro</h2>
                    <p className="text-muted-foreground">Manage stock, suppliers, and procurement.</p>
                </div>
            </div>

            <Tabs defaultValue="items" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="items">Item Master</TabsTrigger>
                    <TabsTrigger value="vendors">Vendor Center</TabsTrigger>
                    <TabsTrigger value="procurement">Requisitions</TabsTrigger>
                    <TabsTrigger value="receiving">Goods Receiving</TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="space-y-4">
                    <ItemMaster items={items as any[]} />
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
                        <RequisitionBoard data={requisitions as any[]} />
                    </div>
                </TabsContent>

                <TabsContent value="receiving" className="space-y-4">
                    <GrnReceiving requests={requisitions as any[]} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
