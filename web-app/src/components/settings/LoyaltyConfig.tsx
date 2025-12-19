
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveLoyaltySettings } from "@/actions/pos-settings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LoyaltyConfigProps {
    outletId: string;
    earningRate: string; // "0.05"
    redemptionRate: string; // "1.0"
}

export function LoyaltyConfig({ outletId, earningRate, redemptionRate }: LoyaltyConfigProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [form, setForm] = useState({
        earningRate: earningRate || "0.05",
        redemptionRate: redemptionRate || "1.0"
    });

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await saveLoyaltySettings(
                outletId,
                parseFloat(form.earningRate),
                parseFloat(form.redemptionRate)
            );
            toast.success("Loyalty settings saved");
            router.refresh();
        } catch (e) {
            toast.error("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Loyalty Program Configuration</CardTitle>
                <CardDescription>Configure how customers earn and redeem points.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Earning Rate (Cashback Ratio)</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            step="0.01"
                            value={form.earningRate}
                            onChange={(e) => setForm({ ...form, earningRate: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            (e.g., 0.05 = 5%)
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        How much value a customer earns back as points per unit of currency spent.
                        <br /> Example: Spend $100 with 0.05 rate = Earn 5 Points (Value $5 if 1:1).
                    </p>
                </div>

                <div className="space-y-2">
                    <Label>Redemption Value per Point</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            step="0.01"
                            value={form.redemptionRate}
                            onChange={(e) => setForm({ ...form, redemptionRate: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            Currency Units
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        The monetary value of 1 Loyalty Point.
                        <br /> Default is 1.0 (1 Point = $1).
                    </p>
                </div>

                <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                </Button>
            </CardContent>
        </Card>
    );
}
