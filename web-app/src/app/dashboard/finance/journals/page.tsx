"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createJournalEntry } from "@/actions/finance";
import { getAccounts } from "@/app/actions";
import { Loader2, Plus, Trash2, Save, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

type LineItem = {
    id: string;
    accountId: string;
    debit: string;
    credit: string;
    description: string;
};

export default function ManualJournalsPage() {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState("");
    const [reference, setReference] = useState("");
    const [lines, setLines] = useState<LineItem[]>([
        { id: "1", accountId: "", debit: "", credit: "", description: "" },
        { id: "2", accountId: "", debit: "", credit: "", description: "" },
    ]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        getAccounts().then(setAccounts);
    }, []);

    const addLine = () => {
        setLines([...lines, { id: crypto.randomUUID(), accountId: "", debit: "", credit: "", description: "" }]);
    };

    const removeLine = (id: string) => {
        if (lines.length > 2) {
            setLines(lines.filter(l => l.id !== id));
        }
    };

    const updateLine = (id: string, field: keyof LineItem, value: string) => {
        setLines(lines.map(l => {
            if (l.id === id) {
                const updated = { ...l, [field]: value };
                // Auto-clear opposite field
                if (field === "debit" && value) updated.credit = "";
                if (field === "credit" && value) updated.debit = "";
                return updated;
            }
            return l;
        }));
    };

    const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const handleSubmit = async () => {
        if (!date || !description || !isBalanced || totalDebit === 0) return;

        startTransition(async () => {
            try {
                await createJournalEntry({
                    date: new Date(date),
                    description,
                    reference,
                    lines: lines.map(l => ({
                        accountId: l.accountId,
                        debit: parseFloat(l.debit) || 0,
                        credit: parseFloat(l.credit) || 0,
                        description: l.description
                    })).filter(l => l.accountId && (l.debit > 0 || l.credit > 0))
                });
                alert("Journal entry posted successfully.");
                router.push("/dashboard/finance");
            } catch (error: any) {
                alert(`Error: ${error.message}`);
            }
        });
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    Manual Journal
                    <HoverCard>
                        <HoverCardTrigger>
                            <Info className="h-5 w-5 text-muted-foreground cursor-help" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-96">
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">When to use Manual Journals?</h4>
                                <ul className="text-sm list-disc pl-4 space-y-1">
                                    <li>Correcting errors in previous transactions.</li>
                                    <li>Recording non-cash items like depreciation.</li>
                                    <li>Adjusting opening balances.</li>
                                    <li>Handling complex splits (e.g., Payroll taxes).</li>
                                </ul>
                            </div>
                        </HoverCardContent>
                    </HoverCard>
                </h1>
                <p className="text-muted-foreground">Create a manual journal entry.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Journal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Date</label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Reference</label>
                            <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="#REF-001" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="text-sm font-medium mb-2 block">Description</label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Journal description..." />
                        </div>
                    </div>

                    <div className="rounded-md border mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Account</TableHead>
                                    <TableHead>Description (Optional)</TableHead>
                                    <TableHead className="w-[150px] text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            Debit
                                            <HoverCard>
                                                <HoverCardTrigger><Info className="h-3 w-3 text-muted-foreground" /></HoverCardTrigger>
                                                <HoverCardContent><p className="text-sm">Assets & Expenses increase with Debit.</p></HoverCardContent>
                                            </HoverCard>
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[150px] text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            Credit
                                            <HoverCard>
                                                <HoverCardTrigger><Info className="h-3 w-3 text-muted-foreground" /></HoverCardTrigger>
                                                <HoverCardContent><p className="text-sm">Liabilities, Equity & Income increase with Credit.</p></HoverCardContent>
                                            </HoverCard>
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>
                                            <Select value={line.accountId} onValueChange={v => updateLine(line.id, "accountId", v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Account" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accounts.map(acc => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            {acc.code} - {acc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={line.description}
                                                onChange={e => updateLine(line.id, "description", e.target.value)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={line.debit}
                                                onChange={e => updateLine(line.id, "debit", e.target.value)}
                                                className="h-8 text-right"
                                                min="0"
                                                step="0.01"
                                                disabled={!!line.credit}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={line.credit}
                                                onChange={e => updateLine(line.id, "credit", e.target.value)}
                                                className="h-8 text-right"
                                                min="0"
                                                step="0.01"
                                                disabled={!!line.debit}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={lines.length <= 2}>
                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <Button variant="outline" onClick={addLine}>
                            <Plus className="mr-2 h-4 w-4" /> Add Line
                        </Button>
                        <div className="flex items-center gap-8 text-sm font-medium">
                            <div className="flex gap-4">
                                <span>Total Debit: ₦{totalDebit.toLocaleString()}</span>
                                <span>Total Credit: ₦{totalCredit.toLocaleString()}</span>
                            </div>
                            <div className={isBalanced ? "text-green-600" : "text-red-600"}>
                                {isBalanced ? "Balanced" : "Unbalanced"}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleSubmit} disabled={!isBalanced || totalDebit === 0 || !description || isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Post Journal
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
