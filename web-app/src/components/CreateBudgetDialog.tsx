"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createBudget } from "@/app/actions";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    amount: z.string().min(1, "Amount is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
}).refine(data => data.categoryId || data.categoryName, {
    message: "Category is required",
    path: ["categoryName"],
});

export function CreateBudgetDialog({
    categories,
    budget,
    defaultCategoryId,
    trigger
}: {
    categories: any[],
    budget?: any,
    defaultCategoryId?: string,
    trigger?: React.ReactNode
}) {
    const [open, setOpen] = useState(false);
    const [isNewCategory, setIsNewCategory] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            categoryId: budget?.categoryId || defaultCategoryId || "",
            categoryName: "",
            amount: budget?.amount ? String(Number(budget.amount)) : "",
            startDate: budget?.startDate ? new Date(budget.startDate).toISOString().split('T')[0] : "",
            endDate: budget?.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const formData = new FormData();
        if (values.categoryId && values.categoryId !== "new") {
            formData.append("categoryId", values.categoryId);
        } else {
            formData.append("categoryName", values.categoryName || "");
        }
        formData.append("amount", values.amount);
        formData.append("startDate", values.startDate);
        formData.append("endDate", values.endDate);

        await createBudget(formData);
        setOpen(false);
        if (!budget) {
            form.reset();
            setIsNewCategory(false);
        }
    }

    const isEdit = !!budget;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"}>
                        {isEdit ? "Edit" : "Set Budget"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Budget" : "Set Budget"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? `Update budget for ${budget.category?.name}` : "Define a budget for a category."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            setIsNewCategory(val === "new");
                                        }}
                                        defaultValue={field.value}
                                        disabled={isEdit} // Disable category selection in edit mode
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                            {!isEdit && <SelectItem value="new">+ Create New Category</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isNewCategory && (
                            <FormField
                                control={form.control}
                                name="categoryName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Category Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Travel" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount (NGN)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="100000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>End Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save Budget</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
