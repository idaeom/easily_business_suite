"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, User, Archive, Gift, Tag, Percent, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import PaymentDialog from "./PaymentDialog";
import ShiftDialog from "./ShiftDialog";
import CustomerDialog from "./CustomerDialog";
import ZReportDialog from "./ZReportDialog";
import { SalesCalculator, CartItem } from "@/lib/sales-calculator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PosMetrics } from "./PosMetrics";
import { getPosProducts } from "@/actions/pos";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";



// Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

interface PosInterfaceProps {
    initialProducts: any[];
    totalProducts: number;
    activeShift: any;
    shiftMetrics: any;
    user: any;
    taxes: any[];
    discounts: any[];
    topItems: any[];
    loyaltySettings: { earningRate: number; redemptionRate: number };
}

export default function PosInterface({
    initialProducts,
    totalProducts,
    activeShift,
    shiftMetrics,
    user,
    taxes,
    discounts,
    topItems,
    loyaltySettings
}: PosInterfaceProps) {
    // Cart & Sales State
    const [cart, setCart] = useState<{ item: any, qty: number }[]>([]);
    const [shift, setShift] = useState(activeShift);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isShiftOpen, setIsShiftOpen] = useState(!activeShift);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [isCustomerOpen, setIsCustomerOpen] = useState(false);
    const [isZReportOpen, setIsZReportOpen] = useState(false);

    // Product Grid State
    const [products, setProducts] = useState(initialProducts);
    const [totalCount, setTotalCount] = useState(totalProducts);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    // Search State
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Extras
    const [selectedDiscountId, setSelectedDiscountId] = useState<string>("none");
    const [redeemLoyalty, setRedeemLoyalty] = useState(false);

    // Handle Outside Click for Suggestions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch Products on Search/Page Change
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // If searching, reset to page 1? Only if search CHANGED.
                // But this effect runs on both. We need to handle page reset separately if desired.
                // For now, let's just fetch.
                const res = await getPosProducts(debouncedSearch, page, 20);
                setProducts(res.products);
                setTotalCount(res.totalCount);
            } catch (error) {
                console.error("Failed to fetch products", error);
            } finally {
                setLoading(false);
            }
        };

        // Skip initial fetch since we have props (unless search changed from empty)
        // Actually, just fetch to keep consistent.
        // Optimization: Only fetch if inputs differ from initial (which they don't at start).
        // Let's just run it if dependencies change.
        if (debouncedSearch !== "" || page !== 1) {
            fetchProducts();
        } else if (debouncedSearch === "" && page === 1 && products !== initialProducts) {
            // Reset to initial if cleared?
            setProducts(initialProducts);
            setTotalCount(totalProducts);
        }
    }, [debouncedSearch, page]);

    // Reset Page on Search Change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);


    const addToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(p => p.item.id === item.id);
            if (existing) {
                return prev.map(p => p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...prev, { item, qty: 1 }];
        });
        setShowSuggestions(false); // Close suggestions
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(p => p.item.id !== itemId));
    };

    // Calculation Logic
    const calculation = useMemo(() => {
        const cartItems: CartItem[] = cart.map(c => ({ price: Number(c.item.price), qty: c.qty }));
        const discountRule = discounts.find(d => d.id === selectedDiscountId);
        const discountArg = discountRule ? { type: discountRule.type as any, value: Number(discountRule.value) } : null;
        const enabledTaxes = taxes.filter(t => t.isEnabled).map(t => ({ ...t, rate: Number(t.rate) }));
        return SalesCalculator.calculate(cartItems, discountArg, enabledTaxes as any, loyaltySettings.earningRate);
    }, [cart, selectedDiscountId, taxes, discounts, loyaltySettings]);

    // Loyalty
    const redemption = useMemo(() => {
        if (!redeemLoyalty || !selectedCustomer) return { value: 0, points: 0 };
        const customerPoints = Number(selectedCustomer.loyaltyPoints || 0);
        const maxRedeemValue = customerPoints * loyaltySettings.redemptionRate;
        const redeemValue = Math.min(maxRedeemValue, calculation.total);
        const pointsUsed = redeemValue / loyaltySettings.redemptionRate;
        return { value: redeemValue, points: pointsUsed };
    }, [redeemLoyalty, selectedCustomer, calculation.total, loyaltySettings]);

    const finalTotalToPay = Math.max(0, calculation.total - redemption.value);

    const handleShiftClosed = () => {
        setShift(null);
        setIsShiftOpen(true);
        setCart([]);
        setSelectedCustomer(null);
        setSelectedDiscountId("none");
        setRedeemLoyalty(false);
    };

    const totalPages = Math.ceil(totalCount / 20);

    return (
        <div className="h-[calc(100vh-100px)] flex gap-4">
            {/* LEFT: PRODUCTS & METRICS */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* METRICS */}
                <PosMetrics metrics={shiftMetrics} />

                {/* SEARCH */}
                <div className="relative z-20" ref={searchRef}>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => setShowSuggestions(true)}
                        />
                    </div>

                    {/* FREQUENT ITEMS DROPDOWN */}
                    {showSuggestions && (search === "" || topItems.length > 0) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg p-2 max-h-60 overflow-y-auto">
                            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Frequent Items
                            </div>
                            {topItems.map(item => (
                                <div
                                    key={item.id}
                                    className="flex justify-between items-center p-2 hover:bg-slate-50 cursor-pointer rounded"
                                    onClick={() => addToCart(item)}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{item.name}</span>
                                        <span className="text-xs text-blue-600">{formatCurrency(item.price)}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {item.frequency ? `${item.frequency} sold recently` : 'Popular'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PRODUCT GRID */}
                <div className="flex-1 overflow-y-auto pr-2 pb-2 min-h-0">
                    {loading ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground">Loading products...</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((item: any) => (
                                <Card
                                    key={item.id}
                                    className={`cursor-pointer hover:border-blue-500 transition-colors ${item.quantity <= 0 ? 'opacity-75 bg-red-50' : ''}`}
                                    onClick={() => addToCart(item)}
                                >
                                    <CardContent className="p-4 text-center space-y-2">
                                        <div className="h-10 w-10 bg-slate-100 rounded-full mx-auto flex items-center justify-center">
                                            <Archive className="text-slate-500 w-5 h-5" />
                                        </div>
                                        <div className="font-semibold text-sm truncate" title={item.name}>{item.name}</div>
                                        <div className="text-blue-600 font-bold text-sm">{formatCurrency(item.price)}</div>
                                        <Badge variant={item.quantity > 0 ? "outline" : "destructive"} className="text-[10px]">
                                            {Number(item.quantity).toFixed(2)} In Stock
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ))}
                            {products.length === 0 && (
                                <div className="col-span-full text-center py-10 text-muted-foreground">
                                    No products found.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* PAGINATION */}
                <div className="flex justify-between items-center p-2 bg-slate-50 border rounded-lg text-sm">
                    <span className="text-muted-foreground">
                        Page {page} of {totalPages || 1} ({totalCount} items)
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* RIGHT: CART */}
            <div className="w-[400px] bg-white border rounded-lg flex flex-col shadow-sm">
                <div className="p-4 border-b bg-slate-50 rounded-t-lg flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" /> Current Sale
                    </h3>
                    <div className="flex items-center gap-2">
                        <Badge variant={shift ? "default" : "destructive"}>
                            {shift ? "Shift Open" : "Closed"}
                        </Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <User className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsShiftOpen(true)}>
                                    Shift Management
                                </DropdownMenuItem>
                                {shift && (
                                    <DropdownMenuItem onClick={() => setIsZReportOpen(true)}>
                                        View Z-Report
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* CUSTOMER SELECTION */}
                <div className="px-4 pt-4 space-y-3">
                    <div className="flex bg-slate-100 rounded-md p-1 border">
                        <Button
                            variant="ghost"
                            className={`flex-1 text-xs h-8 ${!selectedCustomer ? 'bg-white shadow-sm' : ''}`}
                            onClick={() => { setSelectedCustomer(null); setRedeemLoyalty(false); }}
                        >
                            Walk-in
                        </Button>
                        <Button
                            variant="ghost"
                            className={`flex-1 text-xs h-8 ${selectedCustomer ? 'bg-white shadow-sm' : ''}`}
                            onClick={() => setIsCustomerOpen(true)}
                        >
                            {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.map((line: any) => (
                        <div key={line.item.id} className="flex justify-between items-center text-sm border-b pb-2">
                            <div className="flex-1">
                                <div className="font-medium">{line.item.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {line.qty} x {formatCurrency(line.item.price)}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="font-bold">{formatCurrency(line.qty * Number(line.item.price))}</div>
                                <button className="text-red-500 hover:text-red-700" onClick={() => removeFromCart(line.item.id)}>×</button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-10">Cart is empty</div>
                    )}
                </div>

                {/* TOTALS & SETTINGS */}
                <div className="p-4 bg-slate-50 border-t rounded-b-lg space-y-3">
                    {/* Discount Selector */}
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <Select value={selectedDiscountId} onValueChange={setSelectedDiscountId}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="No Discount" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Discount</SelectItem>
                                {discounts.filter(d => d.isEnabled).map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Loyalty Toggle */}
                    {selectedCustomer && (
                        <div className="flex items-center justify-between text-xs bg-blue-50 p-2 rounded border border-blue-100">
                            <div className="flex items-center gap-2">
                                <Gift className="w-3 h-3 text-blue-600" />
                                <span>Redeem Points ({Number(selectedCustomer.loyaltyPoints || 0).toFixed(0)} avail)</span>
                            </div>
                            <Switch checked={redeemLoyalty} onCheckedChange={setRedeemLoyalty} className="scale-75" />
                        </div>
                    )}

                    <div className="space-y-1 pt-2 border-t text-sm">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatCurrency(calculation.subtotal)}</span>
                        </div>
                        {calculation.discountAmount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Discount</span>
                                <span>-{formatCurrency(calculation.discountAmount)}</span>
                            </div>
                        )}
                        {calculation.taxesApplied.map((tax, i) => (
                            <div key={i} className="flex justify-between text-muted-foreground text-xs">
                                <span>{tax.name} ({tax.rate}%) {tax.type === 'INCLUSIVE' && '(Inc)'}</span>
                                <span>{tax.type === 'EXCLUSIVE' ? '+' : ''}{formatCurrency(tax.amount)}</span>
                            </div>
                        ))}
                        {redemption.value > 0 && (
                            <div className="flex justify-between text-blue-600 font-medium">
                                <span>Points Redemption</span>
                                <span>-{formatCurrency(redemption.value)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                            <span>Total</span>
                            <span>{formatCurrency(finalTotalToPay)}</span>
                        </div>
                        {selectedCustomer && (
                            <div className="text-xs text-right text-gray-400">
                                {/* Estimate Points on Net Pay (Total - Redemption) */}
                                Earn +{((finalTotalToPay * loyaltySettings.earningRate) || 0).toFixed(2)} pts
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full h-12 text-lg"
                        disabled={cart.length === 0 || !shift}
                        onClick={() => setIsPaymentOpen(true)}
                    >
                        Charge {formatCurrency(finalTotalToPay)}
                    </Button>
                </div>
            </div>

            <PaymentDialog
                open={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                total={finalTotalToPay}
                items={cart}
                shiftId={shift?.id}
                contactId={selectedCustomer?.id}
                onSuccess={() => {
                    setCart([]);
                    setSelectedCustomer(null);
                    setSelectedDiscountId("none");
                    setRedeemLoyalty(false);
                }}
                transactionExtras={{
                    discountId: selectedDiscountId === "none" ? undefined : selectedDiscountId,
                    discountAmount: calculation.discountAmount,
                    taxAmount: calculation.taxAmount, // Total tax amount
                    taxSnapshot: calculation.taxesApplied,
                    loyaltyPointsEarned: Number(((finalTotalToPay * loyaltySettings.earningRate) || 0).toFixed(2)),
                    loyaltyPointsRedeemed: redemption.points,
                }}
            />

            <ShiftDialog
                open={isShiftOpen}
                onClose={() => setIsShiftOpen(false)}
                activeShift={shift}
                onShiftOpened={(s: any) => { setShift(s); setIsShiftOpen(false); }}
                onShiftClosed={handleShiftClosed}
            />

            <CustomerDialog
                open={isCustomerOpen}
                onOpenChange={setIsCustomerOpen}
                onSelect={(customer: any) => { setSelectedCustomer(customer); setIsCustomerOpen(false); }}
            />

            <ZReportDialog
                open={isZReportOpen}
                onClose={() => setIsZReportOpen(false)}
                shiftId={shift?.id}
                userName={user?.name || "Cashier"}
            />
        </div>
    );
}
