
import React from 'react';
import { getCustomer } from "@/actions/customers";
import { CustomerLedgerView } from "@/components/sales/CustomerLedgerView";
import { notFound } from "next/navigation";

export default async function CustomerDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const customer = await getCustomer(params.id);

    if (!customer) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">{customer.name}</h2>
            <div className="text-muted-foreground">{customer.email} • {customer.phone}</div>

            <CustomerLedgerView customer={customer} />
        </div>
    );
}
