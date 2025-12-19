
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    PlusCircle,
    FileText,
    UserPlus,
    PackagePlus,
    Truck,
    Receipt
} from "lucide-react";

const actions = [
    {
        label: "New Sale",
        href: "/dashboard/business/pos",
        icon: Receipt,
        color: "text-blue-600 bg-blue-50 hover:bg-blue-100"
    },
    {
        label: "New Bill",
        href: "/dashboard/expenses",
        icon: FileText,
        color: "text-purple-600 bg-purple-50 hover:bg-purple-100"
    },
    {
        label: "Add User",
        href: "/dashboard/settings/users?newUser=true",
        icon: UserPlus,
        color: "text-green-600 bg-green-50 hover:bg-green-100"
    },
    {
        label: "Add Stock",
        href: "/dashboard/business/inventory",
        icon: PackagePlus,
        color: "text-orange-600 bg-orange-50 hover:bg-orange-100"
    },
    {
        label: "Dispatch",
        href: "/dashboard/business/operations",
        icon: Truck,
        color: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
    },
    {
        label: "New Task",
        href: "/dashboard/tasks",
        icon: PlusCircle,
        color: "text-slate-600 bg-slate-50 hover:bg-slate-100"
    }
];

export function QuickActions() {
    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-semibold text-slate-800">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {actions.map((action, i) => (
                        <Link key={i} href={action.href}>
                            <Button
                                variant="outline"
                                className="w-full h-auto py-4 flex flex-col gap-2 border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                                <div className={`p-2 rounded-full ${action.color}`}>
                                    <action.icon size={20} />
                                </div>
                                <span className="text-xs font-medium text-slate-600">{action.label}</span>
                            </Button>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
