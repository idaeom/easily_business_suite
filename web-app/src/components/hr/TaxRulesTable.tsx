"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { createTaxRule, updateTaxRule, deleteTaxRule } from "@/app/actions";
import { Edit, Trash2, Plus, Copy, List, Code, X } from "lucide-react";

export function TaxRulesTable({ rules }: { rules: any[] }) {
    const { toast } = useToast();
    const [editingRule, setEditingRule] = useState<any>(null);
    const [open, setOpen] = useState(false);

    // Editor Mode
    const [mode, setMode] = useState<"visual" | "json">("visual");

    // Form Stats
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [isDefault, setIsDefault] = useState(false);

    // Visual Editor State
    const [craEnabled, setCraEnabled] = useState(true);
    const [craFixed, setCraFixed] = useState(200000);
    const [craPercent, setCraPercent] = useState(20);
    const [exemptionThreshold, setExemptionThreshold] = useState(0);
    const [bands, setBands] = useState<{ limit: number, rate: number }[]>([]);

    // JSON Editor State
    const [jsonConfig, setJsonConfig] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Initialize Form
    const loadRule = (rule: any) => {
        setEditingRule(rule);
        setName(rule?.name || "New Tax Rule");
        setDescription(rule?.description || "");
        setIsActive(rule?.isActive ?? true);
        setIsDefault(rule?.isDefault ?? false);

        const r = rule?.rules || {
            type: "progressive",
            cra: { enabled: true, consolidatedParams: { min: 200000 }, percentGross: 0.20 },
            bands: [{ limit: 300000, rate: 0.07 }, { limit: 9999999999, rate: 0.24 }],
            exemptions: { threshold: 360000 }
        };

        // Populate Visual State
        setCraEnabled(r.cra?.enabled ?? false);
        setCraFixed(r.cra?.consolidatedParams?.min || 0);
        setCraPercent((r.cra?.percentGross || 0) * 100); // 0.2 -> 20
        setExemptionThreshold(r.exemptions?.threshold || 0);

        // Populate Bands
        // Ensure bands are sorted or just take as is
        const b = (r.bands || []).map((b: any) => ({ limit: b.limit, rate: b.rate * 100 })); // 0.07 -> 7
        setBands(b);

        // Populate JSON
        setJsonConfig(JSON.stringify(r, null, 2));
        setMode("visual");
        setOpen(true);
    };

    const handleAdd = () => loadRule(null);
    const handleEdit = (rule: any) => loadRule(rule);

    const updateVisualIfNeeded = () => {
        // If switching from JSON to Visual, try to parse JSON
        try {
            const r = JSON.parse(jsonConfig);
            setCraEnabled(r.cra?.enabled ?? false);
            setCraFixed(r.cra?.consolidatedParams?.min || 0);
            setCraPercent((r.cra?.percentGross || 0) * 100);
            setExemptionThreshold(r.exemptions?.threshold || 0);
            setBands((r.bands || []).map((b: any) => ({ limit: b.limit, rate: b.rate * 100 })));
            setJsonError(null);
        } catch (e) {
            // Ignore if invalid JSON, user will stay in JSON mode or fix it
        }
    }

    const updateJsonFromVisual = () => {
        // Construct JSON from visual state
        const rules = {
            type: "progressive",
            taxableIncomeBasis: "gross",
            cra: {
                enabled: craEnabled,
                consolidatedParams: { min: Number(craFixed), percent: 0.01 }, // internal fixed param?
                percentGross: Number(craPercent) / 100
            },
            exemptions: { threshold: Number(exemptionThreshold) },
            bands: bands.map(b => ({
                limit: Number(b.limit),
                rate: Number(b.rate) / 100
            }))
        };
        setJsonConfig(JSON.stringify(rules, null, 2));
    }

    // Band Handlers
    const addBand = () => setBands([...bands, { limit: 0, rate: 0 }]);
    const removeBand = (idx: number) => setBands(bands.filter((_, i) => i !== idx));
    const updateBand = (idx: number, field: 'limit' | 'rate', val: number) => {
        const newBands = [...bands];
        newBands[idx] = { ...newBands[idx], [field]: val };
        setBands(newBands);
    };

    const handleSave = async () => {
        try {
            let finalRules;
            if (mode === "visual") {
                updateJsonFromVisual(); // Update JSON state for consistency
                // Reconstruct directly to be safe
                finalRules = {
                    type: "progressive",
                    taxableIncomeBasis: "gross",
                    cra: {
                        enabled: craEnabled,
                        consolidatedParams: { min: Number(craFixed), percent: 0.01 },
                        percentGross: Number(craPercent) / 100
                    },
                    exemptions: { threshold: Number(exemptionThreshold) },
                    bands: bands.map(b => ({
                        limit: Number(b.limit),
                        rate: Number(b.rate) / 100
                    }))
                };
            } else {
                finalRules = JSON.parse(jsonConfig);
            }

            setJsonError(null);

            const payload = {
                name,
                description,
                rules: finalRules,
                isActive,
                isDefault
            };

            if (editingRule?.id) {
                await updateTaxRule(editingRule.id, payload);
                toast({ title: "Updated", description: "Tax rule updated successfully." });
            } else {
                await createTaxRule(payload);
                toast({ title: "Created", description: "New tax rule created." });
            }
            setOpen(false);
        } catch (e: any) {
            setJsonError("Error saving: " + e.message);
            toast({ title: "Error", description: "Failed to save rule.", variant: "destructive" });
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try { await deleteTaxRule(id); } catch (e) { }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end h-16 items-center">
                <Button onClick={handleAdd}>
                    <Plus className="w-4 h-4 mr-2" /> New Tax Strategy
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Default</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.map((rule) => (
                            <TableRow key={rule.id}>
                                <TableCell className="font-medium">{rule.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{rule.description}</TableCell>
                                <TableCell>
                                    <Badge variant={rule.isActive ? "default" : "outline"}>
                                        {rule.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell>{rule.isDefault && <Badge variant="secondary">Default</Badge>}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="icon" variant="ghost" onClick={() => handleEdit(rule)}><Edit className="w-4 h-4" /></Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(rule.id)} disabled={rule.isDefault}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? "Edit Tax Rule" : "New Tax Rule"}</DialogTitle>
                        <DialogDescription>Define tax bands, reliefs, and exemptions.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-md">
                            <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
                            <Label htmlFor="active">Active</Label>
                        </div>
                        <div className="flex items-center space-x-2 border p-3 rounded-md">
                            <Switch checked={isDefault} onCheckedChange={setIsDefault} id="def" />
                            <Label htmlFor="def">Set as Default</Label>
                        </div>
                    </div>

                    <div className="flex items-center space-x-1 border-b mb-4">
                        <Button
                            variant={mode === "visual" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => { updateVisualIfNeeded(); setMode("visual"); }}
                            className="rounded-b-none"
                        >
                            <List className="w-4 h-4 mr-2" /> Visual Editor
                        </Button>
                        <Button
                            variant={mode === "json" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => { updateJsonFromVisual(); setMode("json"); }}
                            className="rounded-b-none"
                        >
                            <Code className="w-4 h-4 mr-2" /> JSON Source
                        </Button>
                    </div>

                    {mode === "visual" ? (
                        <div className="space-y-6">

                            {/* Reliefs Section */}
                            <div className="bg-slate-50 p-4 rounded-md border space-y-4">
                                <h3 className="font-semibold text-sm uppercase text-slate-500">Reliefs & Exemptions</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tax Exempt Income Threshold (₦)</Label>
                                        <Input type="number" value={exemptionThreshold} onChange={e => setExemptionThreshold(Number(e.target.value))} />
                                        <p className="text-[10px] text-muted-foreground">E.g., 800000 (New Law) or 360000 (Old)</p>
                                    </div>
                                    <div className="flex items-center space-x-2 pt-6">
                                        <Switch checked={craEnabled} onCheckedChange={setCraEnabled} id="cra" />
                                        <Label htmlFor="cra">Enable Consolidated Relief (CRA)</Label>
                                    </div>
                                    {craEnabled && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>CRA Fixed Amount (₦)</Label>
                                                <Input type="number" value={craFixed} onChange={e => setCraFixed(Number(e.target.value))} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>CRA Percentage (%)</Label>
                                                <Input type="number" value={craPercent} onChange={e => setCraPercent(Number(e.target.value))} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Tax Bands Section */}
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100">
                                            <TableHead>Band Limit (Income)</TableHead>
                                            <TableHead>Tax Rate (%)</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bands.map((band, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={band.limit}
                                                        onChange={e => updateBand(idx, 'limit', Number(e.target.value))}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center">
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            value={band.rate}
                                                            onChange={e => updateBand(idx, 'rate', Number(e.target.value))}
                                                            className="w-20 mr-2"
                                                        />
                                                        <span className="text-sm">%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button size="icon" variant="ghost" onClick={() => removeBand(idx)}>
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="p-2 bg-slate-50 border-t text-center">
                                    <Button variant="outline" size="sm" onClick={addBand}>
                                        <Plus className="w-4 h-4 mr-2" /> Add Tax Band
                                    </Button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Textarea
                                value={jsonConfig}
                                onChange={e => setJsonConfig(e.target.value)}
                                className="font-mono text-xs h-[400px]"
                            />
                            {jsonError && <div className="text-red-500 text-xs">{jsonError}</div>}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Configuration</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
