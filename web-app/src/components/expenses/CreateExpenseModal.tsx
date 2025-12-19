"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createExpenseAction } from "@/actions/expenses";
import { getAccountBalancesByType } from "@/actions/finance";
import BeneficiaryRow from "./BeneficiaryRow";

// UI Validation Schema
const formSchema = z.object({
    description: z.string().min(3, "Description is required"),
    amount: z.number().min(1, "Amount must be positive"),
    incurredAt: z.string(),
    category: z.string().optional(),
    expenseAccountId: z.string().optional(),
    beneficiaries: z.array(z.object({
        name: z.string().min(1, "Name required"),
        bankName: z.string().min(1, "Bank required"),
        bankCode: z.string().min(1, "Bank Code required"), // You'd ideally select this from a dropdown (e.g. Paystack Bank List)
        accountNumber: z.string().length(10, "10 digits required"),
        amount: z.number().min(1),
    })).min(1, "At least one beneficiary required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateExpenseModal({ taskId, isOpen, onClose }: { taskId: string, isOpen: boolean, onClose: () => void }) {
    const [expenseAccounts, setExpenseAccounts] = useState<{ id: string, name: string, code: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Expense Accounts on mount
    useEffect(() => {
        getAccountBalancesByType("EXPENSE").then(accounts => {
            // @ts-ignore
            setExpenseAccounts(accounts);
        });
    }, []);

    const { register, control, handleSubmit, watch, formState: { errors }, setValue } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
            incurredAt: new Date().toISOString().split('T')[0],
            beneficiaries: [{ name: "", bankName: "", bankCode: "000", accountNumber: "", amount: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "beneficiaries"
    });

    // Real-time Math Check
    const beneficiaries = watch("beneficiaries");
    const beneficiariesTotal = beneficiaries?.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) || 0;
    const mainAmount = watch("amount");
    const isBalanced = Math.abs(beneficiariesTotal - mainAmount) < 0.01;

    async function onSubmit(data: FormValues) {
        if (!isBalanced) {
            alert(`Totals do not match! Expense: ${mainAmount}, Beneficiaries: ${beneficiariesTotal}`);
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("taskId", taskId);
        formData.append("description", data.description);
        formData.append("amount", data.amount.toString());
        formData.append("incurredAt", data.incurredAt);
        if (data.category) formData.append("category", data.category);
        if (data.expenseAccountId) formData.append("expenseAccountId", data.expenseAccountId);

        // Serialize complex object
        formData.append("beneficiaries", JSON.stringify(data.beneficiaries));

        // Get file input manually since react-hook-form doesn't control FileLists well
        const fileInput = document.getElementById("receipt-upload") as HTMLInputElement;
        if (fileInput?.files?.[0]) {
            formData.append("receipt", fileInput.files[0]);
        }

        const result = await createExpenseAction(formData);

        setIsSubmitting(false);

        if (result?.error) {
            alert(result.error);
        } else {
            onClose(); // Success!
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">New Expense Request</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-gray-500 hover:text-red-500" /></button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

                    {/* Main Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                            <input {...register("description")} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Site Visit Logistics" />
                            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Total Amount (₦)</label>
                            <input type="number" {...register("amount", { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Date Incurred</label>
                            <input type="date" {...register("incurredAt")} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1 text-gray-700">Expense Category (Chart of Accounts)</label>
                            <select {...register("expenseAccountId")} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Select Category...</option>
                                {expenseAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Beneficiaries Section (Dynamic) */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium text-sm text-gray-700">Beneficiaries (Splits)</h3>
                            <div className={`text-xs font-mono px-2 py-1 rounded border ${isBalanced ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                Sum: {beneficiariesTotal.toLocaleString()} / Total: {mainAmount.toLocaleString()}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <BeneficiaryRow
                                    key={field.id}
                                    index={index}
                                    register={register}
                                    remove={remove}
                                    setValue={setValue}
                                    watch={watch}
                                    errors={errors}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => append({ name: "", bankName: "", bankCode: "000", accountNumber: "", amount: 0 })}
                            className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            <PlusIcon className="w-4 h-4" /> Add Beneficiary
                        </button>
                    </div>

                    {/* Receipt Upload */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Attach Receipt</label>
                        <input
                            id="receipt-upload"
                            type="file"
                            accept="image/*,.pdf"
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !isBalanced}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {isSubmitting ? "Creating..." : "Create Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
