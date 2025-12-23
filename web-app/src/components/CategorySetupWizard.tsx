"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { initializeItemCategories, CategoryTemplateType } from "@/actions/setup-categories";
import { BookOpen, CheckCircle2, Loader2, Store, ShoppingBag, ShoppingCart, Briefcase, Pill } from "lucide-react";

export function CategorySetupWizard() {
    const [open, setOpen] = useState(false);
    const [template, setTemplate] = useState<CategoryTemplateType>("RETAIL");
    const [step, setStep] = useState<"SELECT" | "CONFIRM" | "SUCCESS">("SELECT");
    const [isPending, startTransition] = useTransition();
    const [resultCount, setResultCount] = useState(0);

    const handleRun = () => {
        startTransition(async () => {
            try {
                const res = await initializeItemCategories(template);
                if (res.success) {
                    setResultCount(res.count);
                    setStep("SUCCESS");
                }
            } catch (error) {
                console.error(error);
                alert("Failed to load categories. Please try again.");
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
                    Load Presets
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                {step === "SELECT" && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Setup Product Categories</DialogTitle>
                            <DialogDescription>
                                Select your business type to pre-load standard categories.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                            <RadioGroup value={template} onValueChange={(v: string) => setTemplate(v as CategoryTemplateType)}>

                                <TemplateOption
                                    id="retail" value="RETAIL" label="Retail Store"
                                    desc="Clothing, Shoes, Electronics, Accessories, Home Goods."
                                    icon={<ShoppingBag className="h-5 w-5 text-blue-500" />}
                                />

                                <TemplateOption
                                    id="supermarket" value="SUPERMARKET" label="Supermarket / Grocery"
                                    desc="Produce, Dairy, Bakery, Canned Goods, Household."
                                    icon={<ShoppingCart className="h-5 w-5 text-green-500" />}
                                />

                                <TemplateOption
                                    id="restaurant" value="RESTAURANT" label="Restaurant & Bar"
                                    desc="Starters, Mains, Desserts, Beverages, Alcohol."
                                    icon={<Store className="h-5 w-5 text-orange-500" />}
                                />

                                <TemplateOption
                                    id="service" value="SERVICE" label="Service Business"
                                    desc="Labor, Consultation, Support, Installation."
                                    icon={<Briefcase className="h-5 w-5 text-purple-500" />}
                                />

                                <TemplateOption
                                    id="pharmacy" value="PHARMACY" label="Pharmacy"
                                    desc="Drugs, Medical Supplies, Personal Care."
                                    icon={<Pill className="h-5 w-5 text-red-500" />}
                                />

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
                            <DialogTitle>Confirm Load</DialogTitle>
                            <DialogDescription>
                                Load categories for <strong>{template}</strong>?
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4 text-sm text-muted-foreground">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Existing categories will be skipped (no duplicates).</li>
                                <li>New categories will be added to your list.</li>
                                <li>You can edit or delete them later.</li>
                            </ul>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep("SELECT")} disabled={isPending}>Back</Button>
                            <Button onClick={handleRun} disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading...
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
                                Success
                            </DialogTitle>
                            <DialogDescription>
                                Loaded categories successfully.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <p className="text-center text-lg font-medium">
                                Added {resultCount} new categories.
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

function TemplateOption({ id, value, label, desc, icon }: { id: string, value: string, label: string, desc: string, icon: React.ReactNode }) {
    return (
        <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer relative">
            <RadioGroupItem value={value} id={id} className="mt-1" />
            <div className="grid gap-1.5 leading-none flex-1">
                <div className="flex items-center gap-2">
                    {icon}
                    <Label htmlFor={id} className="font-semibold cursor-pointer text-base">
                        {label}
                    </Label>
                </div>
                <p className="text-sm text-muted-foreground pl-7">
                    {desc}
                </p>
            </div>
            {/* Make the whole card clickable implies needing an onclick handler on parent or label wrapping, 
                 but RadioGroupItem handles logic. 
                 The current structure requires clicking the radio or label. 
                 Adding an overlay label is a common trick. */}
            <Label htmlFor={id} className="absolute inset-0 cursor-pointer" />
        </div>
    );
}
