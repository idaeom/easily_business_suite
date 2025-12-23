import { getEnterpriseMetrics } from "@/actions/dashboard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ModuleWidget } from "@/components/dashboard/ModuleWidget";
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";
import {
    BanknotesIcon,
    BriefcaseIcon,
    CubeIcon,
    UserGroupIcon,
    TruckIcon,
    ShoppingBagIcon
} from "@heroicons/react/24/outline";

export default async function DashboardPage() {
    const data = await getEnterpriseMetrics();

    return (
        <div className="space-y-8 pb-8">

            {/* Quick Actions */}
            <QuickActions />

            <LowStockAlerts />

            {/* Main Modules Grid */}
            <h2 className="text-lg font-semibold text-slate-800 mb-4 px-1">Business Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. SALES & POS */}
                <ModuleWidget
                    title="Sales & POS"
                    icon={ShoppingBagIcon}
                    color="blue"
                    href="/dashboard/business/sales"
                    metrics={[
                        { label: "Today's Revenue", value: `₦${data.sales.todayTotal.toLocaleString()}`, status: "success" },
                        { label: "Transactions", value: data.sales.todayCount }
                    ]}
                />

                {/* 2. FINANCIAL HEALTH */}
                <ModuleWidget
                    title="Financial Overview"
                    icon={BanknotesIcon}
                    color="green"
                    href="/dashboard/finance"
                    metrics={[
                        { label: "Net Profit", value: `₦${data.finance.netProfit.toLocaleString()}`, status: data.finance.isProfitable ? "success" : "danger" },
                        { label: "Margin", value: `${data.finance.profitMargin}%`, subtext: "Profit Margin" }
                    ]}
                />

                {/* 3. INVENTORY */}
                <ModuleWidget
                    title="Inventory"
                    icon={CubeIcon}
                    color="orange"
                    href="/dashboard/business/inventory"
                    metrics={[
                        { label: "Low Stock Items", value: data.inventory.lowStock, status: data.inventory.lowStock > 0 ? "warning" : "neutral", subtext: "Restock needed" }
                    ]}
                />

                {/* 4. OPERATIONS */}
                <ModuleWidget
                    title="Operations"
                    icon={TruckIcon}
                    color="indigo"
                    href="/dashboard/business/operations"
                    metrics={[
                        { label: "Pending Dispatches", value: data.operations.pendingDispatches, status: "neutral" }
                    ]}
                />

                {/* 5. HR & TEAM */}
                <ModuleWidget
                    title="HR & Payroll"
                    icon={UserGroupIcon}
                    color="purple"
                    href="/dashboard/hr"
                    metrics={[
                        { label: "Total Staff", value: data.hr.totalStaff },
                        { label: "Next Payroll", value: "Pending" }
                    ]}
                />

                {/* 6. TASKS */}
                <ModuleWidget
                    title="Project Tasks"
                    icon={BriefcaseIcon}
                    color="sky"
                    href="/dashboard/tasks"
                    metrics={[
                        { label: "Active", value: data.tasks.active, status: "neutral" },
                        { label: "Overdue", value: data.tasks.overdue, status: data.tasks.overdue > 0 ? "danger" : "success" }
                    ]}
                />

            </div>
        </div>
    );
}
