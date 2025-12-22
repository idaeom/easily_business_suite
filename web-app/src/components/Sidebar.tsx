"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, CheckSquare, Wallet, Settings, PieChart, Users, Briefcase,
    ShoppingCart, Package, Truck, Store, Landmark, Calculator, LogOut, CreditCard, Banknote
} from "lucide-react";

import React from 'react';
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";

// 1. Management
const managementItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
];

// 2. Commerce (Business Suite)
const commerceItems = [
    { href: "/dashboard/business/sales", label: "Sales Pro", icon: ShoppingCart },
    { href: "/dashboard/business/inventory", label: "Inventory Pro", icon: Package },
    { href: "/dashboard/business/operations", label: "Operations Pro", icon: Truck },
    { href: "/dashboard/business/customers", label: "Customers", icon: Users },
    { href: "/dashboard/business/pos", label: "Invoice Pro (POS)", icon: Store },
    { href: "/dashboard/business/revenue", label: "Revenue Pro", icon: Banknote },
];

// 3. Finance
const financeItems = [
    { href: "/dashboard/finance", label: "General Ledger", icon: Landmark },
    { href: "/dashboard/finance/coa", label: "Chart of Accounts", icon: Users }, // Using Users temporarily or List
    { href: "/dashboard/business/finance/accounts", label: "Business Accounts", icon: CreditCard },
    { href: "/dashboard/expenses", label: "Expenses", icon: Wallet },
    { href: "/dashboard/budgets", label: "Budgets", icon: Calculator },
    { href: "/dashboard/reports", label: "Financial Reports", icon: PieChart },
];

// 4. Human Resources
const hrItems = [
    { href: "/dashboard/hr", label: "HR & Payroll", icon: Briefcase },
    { href: "/dashboard/teams", label: "Teams", icon: Users },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isHovered, setIsHovered] = React.useState(false);

    // Sidebar width: 80px (collapsed) -> 260px (expanded)

    const NavGroup = ({ items, title }: { items: any[], title?: string }) => (
        <div className="space-y-1 mb-6">
            {title && isHovered && (
                <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 whitespace-nowrap"
                >
                    {title}
                </motion.h3>
            )}
            {/* Divider when collapsed if Title exists */}
            {title && !isHovered && <div className="h-px bg-slate-800 mx-4 my-2" />}

            {items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all relative group text-sm",
                            active ? "text-white bg-white/10" : "text-slate-400 hover:text-white hover:bg-white/5",
                            !isHovered && "justify-center px-2"
                        )}
                        title={!isHovered ? item.label : undefined}
                    >
                        {active && (
                            <motion.div
                                layoutId="activeNav"
                                className="absolute inset-0 bg-blue-600 rounded-lg"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-3">
                            <Icon size={20} className="shrink-0" />
                            {isHovered && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="font-medium whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </span>
                    </Link>
                );
            })}
        </div>
    );

    return (
        <motion.div
            className="bg-slate-950 text-white h-screen flex flex-col border-r border-slate-800 z-50 shadow-2xl"
            initial={{ width: "5rem" }}
            animate={{ width: isHovered ? "16rem" : "5rem" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="p-4 flex items-center h-20 overflow-hidden relative">
                <div className={cn("flex items-center gap-3 transition-all duration-300", isHovered ? "opacity-100" : "opacity-0")}>
                    <div className="min-w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-xl">
                        E
                    </div>
                    <div className="whitespace-nowrap">
                        <h1 className="text-lg font-bold bg-gradient-to-tr from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Easily Business
                        </h1>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">ENTERPRISE SUITE</p>
                    </div>
                </div>

                {/* Logo when collapsed */}
                {!isHovered && (
                    <div className="absolute left-4 top-5 w-12 h-10 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg">
                        E
                    </div>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
                <NavGroup items={managementItems} title="Overview" />
                <NavGroup items={commerceItems} title="Commerce Pro" />
                <NavGroup items={financeItems} title="Finance Pro" />
                <NavGroup items={hrItems} title="HR Pro" />

                <div className="mt-4 px-2">
                    <Link
                        href="/dashboard/settings"
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all text-sm text-slate-400 hover:text-white hover:bg-white/5",
                            pathname.startsWith("/dashboard/settings") && "bg-white/5 text-white",
                            !isHovered && "justify-center px-2"
                        )}
                        title={!isHovered ? "Settings" : undefined}
                    >
                        <div className="relative z-10 flex items-center gap-3">
                            <Settings size={20} className="shrink-0" />
                            {isHovered && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="font-medium whitespace-nowrap"
                                >
                                    Settings
                                </motion.span>
                            )}
                        </div>
                    </Link>
                </div>
                <div className="mt-2 px-2">
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all text-sm text-red-400 hover:text-red-300 hover:bg-white/5",
                            !isHovered && "justify-center px-2"
                        )}
                        title={!isHovered ? "Sign Out" : undefined}
                    >
                        <div className="relative z-10 flex items-center gap-3">
                            <LogOut size={20} className="shrink-0" />
                            {isHovered && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="font-medium whitespace-nowrap"
                                >
                                    Sign Out
                                </motion.span>
                            )}
                        </div>
                    </button>
                </div>
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className={cn("flex items-center gap-3", !isHovered && "justify-center")}>
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
                        U
                    </div>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="whitespace-nowrap overflow-hidden"
                        >
                            <p className="text-sm font-medium">Administrator</p>
                            <p className="text-xs text-slate-400">admin@easily.com</p>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
