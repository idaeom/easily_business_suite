
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitAppraisal } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash, Wand2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

type Employee = {
    id: string;
    name: string | null;
    email: string;
};

type KPI = {
    name: string;
    score: number;
};

export default function AppraisalForm({ employees, onSuccess }: { employees: Employee[], onSuccess?: () => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState("");
    const [period, setPeriod] = useState("Q4 2024");
    const [feedback, setFeedback] = useState("");

    // KPI State
    const [kpis, setKpis] = useState<KPI[]>([{ name: "Core Job Function", score: 5 }]);

    // Calculated Score (Live Preview)
    const averageScore = kpis.length > 0
        ? (kpis.reduce((acc, k) => acc + k.score, 0) / kpis.length).toFixed(1)
        : "0.0";

    function addKPI() {
        if (kpis.length >= 10) {
            toast({ title: "Limit Reached", description: "Maximum 10 KPIs allowed.", variant: "destructive" });
            return;
        }
        setKpis([...kpis, { name: "", score: 5 }]);
    }

    function removeKPI(index: number) {
        const newKpis = [...kpis];
        newKpis.splice(index, 1);
        setKpis(newKpis);
    }

    function updateKPI(index: number, field: keyof KPI, value: any) {
        const newKpis = [...kpis];
        // @ts-ignore
        newKpis[index][field] = value;
        setKpis(newKpis);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!userId) {
            toast({ title: "Error", description: "Please select an employee.", variant: "destructive" });
            return;
        }
        if (kpis.some(k => !k.name.trim())) {
            toast({ title: "Error", description: "All KPIs must have a name.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            // Rating is derived by backend, but we pass 0 or a placeholder as 'rating' arg is required by legacy signature
            // Updating the submitAppraisal action is best, but for now we pass a dummy '3' and let backend handle it
            // Actually, we updated submitAppraisal to take kpis.
            // Using average score mapped to 1-5 for the legacy rating field to keep lists nice.
            const legacyRating = Math.max(1, Math.min(5, Math.round(parseFloat(averageScore) / 2)));

            await submitAppraisal(userId, legacyRating, feedback, period, kpis);

            toast({
                title: "Appraisal Generated",
                description: `Report drafted with Objective Score: ${averageScore}/10`,
            });
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to submit appraisal",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={userId} onValueChange={setUserId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.name || emp.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Period</Label>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Q1 2024">Q1 2024</SelectItem>
                            <SelectItem value="Q2 2024">Q2 2024</SelectItem>
                            <SelectItem value="Q3 2024">Q3 2024</SelectItem>
                            <SelectItem value="Q4 2024">Q4 2024</SelectItem>
                            <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Key Performance Indicators (Max 10)</Label>
                    <div className="text-sm font-medium bg-white px-3 py-1 rounded border shadow-sm">
                        Objective Score: <span className="text-primary font-bold">{averageScore}/10</span>
                    </div>
                </div>

                {kpis.map((kpi, index) => (
                    <div key={index} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs text-muted-foreground">KPI Name</Label>
                            <Input
                                value={kpi.name}
                                onChange={(e) => updateKPI(index, "name", e.target.value)}
                                placeholder="e.g. Sales Target Achievement"
                            />
                        </div>
                        <div className="w-1/3 space-y-2">
                            <Label className="text-xs text-muted-foreground">Score (1-10): {kpi.score}</Label>
                            <Slider
                                defaultValue={[5]}
                                value={[kpi.score]}
                                max={10}
                                min={1}
                                step={1}
                                onValueChange={(vals) => updateKPI(index, "score", vals[0])}
                                className="py-2"
                            />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeKPI(index)} className="text-muted-foreground hover:text-destructive">
                            <Trash size={16} />
                        </Button>
                    </div>
                ))}

                <Button type="button" variant="outline" size="sm" onClick={addKPI} className="w-full border-dashed">
                    <Plus className="mr-2 h-4 w-4" /> Add KPI
                </Button>
            </div>

            <div className="space-y-2">
                <Label>Manager's Internal Notes (Optional)</Label>
                <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Any private notes..."
                    rows={3}
                />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                {loading ? (
                    "Generating Report..."
                ) : (
                    <span className="flex items-center">
                        <Wand2 className="mr-2 h-4 w-4" /> Generate Intelligent Appraisal Report
                    </span>
                )}
            </Button>
        </form>
    );
}
