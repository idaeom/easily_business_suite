
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { initializeStandardCOA } from "@/actions/setup";
import { COATemplateType } from "@/lib/constants/standard-coa";
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";

export function StandardCOAWizard() {
    const [open, setOpen] = useState(false);
    const [template, setTemplate] = useState<COATemplateType>("SERVICE");
    const [step, setStep] = useState<"SELECT" | "CONFIRM" | "SUCCESS">("SELECT");
    const [isPending, startTransition] = useTransition();
    const [resultCount, setResultCount] = useState(0);

    const handleRun = () => {
        startTransition(async () => {
            try {
                const res = await initializeStandardCOA(template);
                if (res.success) {
                    setResultCount(res.count);
                    setStep("SUCCESS");
                }
            } catch (error) {
                console.error(error);
                alert("Failed to initialize accounts. Please try again.");
            }
        });
    };

    const reset = () => {
        setOpen(false);
        setStep("SELECT");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Load Standard Accounts
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                {step === "SELECT" && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Setup Chart of Accounts</DialogTitle>
                            <DialogDescription>
                                Select a template that best matches your business type. This will create a standard set of accounts tailored for Nigeria.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <RadioGroup value={template} onValueChange={(v: string) => setTemplate(v as COATemplateType)}>
                                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem value="SERVICE" id="service" className="mt-1" />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="service" className="font-semibold cursor-pointer">
                                            Service Business
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Best for consultants, agencies, and service providers. Includes basic assets, expenses, and simplified revenue tracking.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem value="RETAIL" id="retail" className="mt-1" />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="retail" className="font-semibold cursor-pointer">
                                            Retail & Trading
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            For shops and maximizing inventory. Includes "Inventory Assets", "Cost of Goods Sold", and trading accounts.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem value="MANUFACTURING" id="mfg" className="mt-1" />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="mfg" className="font-semibold cursor-pointer">
                                            Manufacturing
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            For factories and producers. Adds "Raw Materials", "WIP", and "Factory Overhead" accounts.
                                        </p>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={() => setStep("CONFIRM")}>Next</Button>
                        </DialogFooter>
                    </>
                )}

                {step === "CONFIRM" && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Confirm Setup</DialogTitle>
                            <DialogDescription>
                                You are about to load the <strong>{template.replace("_", " ")}</strong> template.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 text-sm text-muted-foreground">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Existing accounts with the same code will <strong>NOT</strong> be overwritten.</li>
                                <li>New accounts (e.g., VAT Output, WHT Payable) will be created.</li>
                                <li>System tax settings will be automatically linked to these accounts.</li>
                            </ul>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep("SELECT")} disabled={isPending}>Back</Button>
                            <Button onClick={handleRun} disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    "Confirm & Load"
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === "SUCCESS" && (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-6 w-6" />
                                Setup Complete
                            </DialogTitle>
                            <DialogDescription>
                                Successfully initialized the Chart of Accounts.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <p className="text-center text-lg font-medium">
                                Created {resultCount} new accounts.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button onClick={reset} className="w-full">Done</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
