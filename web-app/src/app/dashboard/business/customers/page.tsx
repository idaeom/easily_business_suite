import React from 'react';
import { getContacts, getFrequentCustomers } from "@/actions/crm";
import { CustomersView } from "@/components/crm/CustomersView";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams;
    const customers = await getContacts(q || "", "CUSTOMER");
    const frequentCustomers = await getFrequentCustomers();

    return (
        <CustomersView
            customers={customers}
            frequentCustomers={frequentCustomers}
            basePath="/dashboard/business/customers"
        />
    );
}
