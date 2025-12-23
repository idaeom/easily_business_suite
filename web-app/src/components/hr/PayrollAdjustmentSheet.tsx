
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings2, RefreshCw } from "lucide-react";
import { PayrollEngine, type PayrollInput } from "@/lib/payroll-engine";
import { updatePayrollItem } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";

export default function PayrollAdjustmentSheet({ item }: { item: any }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initial State derived from Item
    const breakdown = item.breakdown as any;
    const initialInput: PayrollInput = breakdown.input || {
        earnings: {
            // Handle new structure (allowances.basic) AND legacy structure (basic)
            basic: breakdown.allowances?.basic ?? breakdown.basic ?? 0,
            housing: breakdown.allowances?.housing ?? breakdown.housing ?? 0,
            transport: breakdown.allowances?.transport ?? breakdown.transport ?? 0,
            others: breakdown.allowances?.others ?? breakdown.otherAllowances ?? 0,
            bonuses: breakdown.bonuses ?? 0
        },
        settings: {
            isPensionActive: true,
            pensionVoluntary: 0,
            isNhfActive: false,
            isNhisActive: false,
            lifeAssurance: 0,
            totalDays: 22,
            absentDays: 0,
            otherDeductions: 0
        }
    };

    const [input, setInput] = useState<PayrollInput>(initialInput);

    // Live Preview
    const preview = useMemo(() => {
        return PayrollEngine.calculate(input);
    }, [input]);

    const handleChange = (section: keyof PayrollInput, field: string, value: any) => {
        setInput(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    async function handleSave() {
        if (JSON.stringify(input) === JSON.stringify(breakdown.input)) {
            toast({ title: "No Changes", description: "You haven't made any adjustments.", variant: "default" });
            return;
        }

        setLoading(true);
        try {
            await updatePayrollItem(item.id, input);
            toast({ title: "Updated", description: "Payroll item adjusted successfully." });
            setOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to update item.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 ml-2">
                    <Settings2 className="h-4 w-4" />
                    <span className="sr-only">Adjust</span>
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Adjust Payroll: {item.user.name}</SheetTitle>
                    <SheetDescription>
                        Modify variable pay, deductions, and tax settings for this run.
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    {/* Live Preview Banner */}
                    <div className="bg-slate-50 p-4 rounded-lg border flex justify-between items-center sticky top-0 z-10">
                        <div>
                            <div className="text-xs text-muted-foreground">Original Net</div>
                            <div className="font-mono text-sm line-through text-muted-foreground">{formatCurrency(Number(item.netPay))}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">New Net Pay</div>
                            <div className="font-bold text-xl text-green-600">{formatCurrency(preview.netPay)}</div>
                        </div>
                    </div>

                    {/* Earnings Adjustment */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Variable Earnings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Bonuses (Taxable)</Label>
                                <Input
                                    type="number"
                                    value={input.earnings.bonuses}
                                    onChange={e => handleChange('earnings', 'bonuses', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Attendance */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Attendance</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Total Days</Label>
                                <Input
                                    type="number"
                                    value={input.settings.totalDays}
                                    onChange={e => handleChange('settings', 'totalDays', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Days Absent</Label>
                                <Input
                                    type="number"
                                    value={input.settings.absentDays}
                                    onChange={e => handleChange('settings', 'absentDays', Number(e.target.value))}
                                />
                            </div>
                        </div>
                        {input.settings.absentDays > 0 && (
                            <div className="text-xs text-red-500">
                                Pro-Rata Factor: {(preview.proRataFactor * 100).toFixed(1)}% applied to basic/allowances.
                            </div>
                        )}
                    </div>

                    {/* Deductions & Reliefs */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Deductions & Configuration</h3>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="pension">Pension (8%)</Label>
                            <Switch
                                id="pension"
                                checked={input.settings.isPensionActive}
                                onCheckedChange={(c: boolean) => handleChange('settings', 'isPensionActive', c)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="nhf">NHF (2.5%)</Label>
                            <Switch
                                id="nhf"
                                checked={input.settings.isNhfActive}
                                onCheckedChange={(c: boolean) => handleChange('settings', 'isNhfActive', c)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label>Other Deductions</Label>
                                <Input
                                    type="number"
                                    value={input.settings.otherDeductions}
                                    onChange={e => handleChange('settings', 'otherDeductions', Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Voluntary Pension</Label>
                                <Input
                                    type="number"
                                    value={input.settings.pensionVoluntary}
                                    onChange={e => handleChange('settings', 'pensionVoluntary', Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={loading} className="w-full">
                        {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
