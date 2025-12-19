"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, CheckSquare, Wallet, Settings, PieChart, Users, LogOut, Banknote, Briefcase,
    ShoppingBag, Package, Truck, Store, Calculator, Landmark
} from "lucide-react";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { BranchSwitcherWrapper } from "@/components/BranchSwitcherWrapper";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/dashboard/business/sales", label: "Sales", icon: ShoppingBag },
    { href: "/dashboard/business/inventory", label: "Inventory", icon: Package },
    { href: "/dashboard/business/operations", label: "Ops", icon: Truck },
    { href: "/dashboard/business/pos", label: "POS", icon: Store },
    { href: "/dashboard/finance", label: "Ledger", icon: Landmark },
    { href: "/dashboard/expenses", label: "Expenses", icon: Wallet },
    { href: "/dashboard/budgets", label: "Budgets", icon: Calculator },
    { href: "/dashboard/reports", label: "Reports", icon: PieChart },
    { href: "/dashboard/hr", label: "HR", icon: Briefcase },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Navigation({ currentMode }: { currentMode: "LIVE" | "TEST" }) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white shadow-md">
                <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Easily Business
                </h1>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                    <LogOut size={20} />
                </Button>
            </header>

            {/* Desktop Top Navigation */}
            <header className={cn(
                "hidden md:flex items-center justify-between px-8 py-4 text-white shadow-md transition-colors duration-300",
                currentMode === "TEST" ? "bg-orange-900" : "bg-slate-900"
            )}>
                <div className="flex items-center gap-8">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Easily Business Suite
                    </h1>
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full transition-all relative group",
                                        isActive ? "text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeNavDesktop"
                                            className="absolute inset-0 bg-blue-600 rounded-full"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Icon size={18} />
                                        <span className="font-medium text-sm">{item.label}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>


                <div className="flex items-center gap-3">
                    <BranchSwitcherWrapper />
                    <GlobalSearch />
                    <NotificationBell />
                    <ModeToggle currentMode={currentMode} />
                    <Link href="/dashboard/profile">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white hover:bg-blue-600 transition-colors cursor-pointer">
                            U
                        </div>
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Sign Out"
                    >
                        <LogOut size={20} />
                    </Button>
                </div>
            </header>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 z-50 pb-safe">
                <div className="flex justify-around items-center p-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-all relative group flex-1",
                                    isActive ? "text-blue-400" : "text-slate-400"
                                )}
                            >
                                <Icon size={24} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavMobile"
                                        className="absolute -top-2 w-1 h-1 bg-blue-400 rounded-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
