
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function RevenueNav({ pendingShifts, pendingWallet }: { pendingShifts?: number; pendingWallet?: number }) {
    const pathname = usePathname();

    const tabs = [
        { name: "Shift Reconciliation", href: "/dashboard/business/revenue", count: pendingShifts },
        { name: "Wallet Reconciliation", href: "/dashboard/business/revenue/wallet", count: pendingWallet },
    ];

    return (
        <div className="flex items-center gap-2 mb-6 border-b pb-2">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                    <Link key={tab.href} href={tab.href}>
                        <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn(
                                "rounded-full relative",
                                isActive && "bg-slate-100 dark:bg-slate-800 font-semibold"
                            )}
                        >
                            {tab.name}
                            {(tab.count || 0) > 0 && (
                                <span className={cn(
                                    "ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </Button>
                    </Link>
                );
            })}
        </div>
    );
}
