
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
    { name: "Overview", href: "/dashboard/hr" },
    { name: "Employees", href: "/dashboard/hr/employees" },
    { name: "Payroll", href: "/dashboard/hr/payroll" },
    { name: "Leave", href: "/dashboard/hr/leaves" },
    { name: "Appraisals", href: "/dashboard/hr/appraisals" },
];

export default function HrLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="space-y-6">
            <div className="border-b">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href !== "/dashboard/hr" && pathname.startsWith(tab.href));
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={cn(
                                    isActive
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                                    "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium"
                                )}
                            >
                                {tab.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="min-h-[500px]">
                {children}
            </div>
        </div>
    );
}
