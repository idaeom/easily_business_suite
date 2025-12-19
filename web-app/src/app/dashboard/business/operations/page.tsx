
import React from 'react';
import { getDispatches, getHaulageProviders } from "@/actions/operations";
import DispatchBoard from "@/components/operations/DispatchBoard";
import { HaulageManagerDialog } from "@/components/operations/HaulageManagerDialog";

export default async function OperationsPage() {
    // Parallel Data Fetching
    const [dispatches, haulageProviders] = await Promise.all([
        getDispatches(),
        getHaulageProviders()
    ]);

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Operations Pro</h2>
                    <p className="text-muted-foreground">Logistics, Dispatches and Delivery Tracking.</p>
                </div>
                <HaulageManagerDialog providers={haulageProviders as any[]} />
            </div>

            <div className="flex-1 overflow-hidden">
                <DispatchBoard
                    dispatches={dispatches as any[]}
                    initialHaulageProviders={haulageProviders as any[]}
                />
            </div>
        </div>
    );
}
