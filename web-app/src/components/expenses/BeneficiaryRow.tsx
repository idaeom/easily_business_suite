"use client";

import { useState, useEffect } from "react";
import { UseFormRegister, Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { TrashIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { getBanks, resolveAccount } from "@/app/actions";

interface BeneficiaryRowProps {
    index: number;
    register: UseFormRegister<any>;
    remove: (index: number) => void;
    setValue: UseFormSetValue<any>;
    watch: UseFormWatch<any>;
    errors: any;
}

export default function BeneficiaryRow({ index, register, remove, setValue, watch, errors }: BeneficiaryRowProps) {
    const [banks, setBanks] = useState<any[]>([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE"); // Keep this state
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Watch fields for this row
    const bankCode = watch(`beneficiaries.${index}.bankCode`);
    const accountNumber = watch(`beneficiaries.${index}.accountNumber`);

    useEffect(() => {
        // Fetch banks on mount
        getBanks().then(setBanks).catch(console.error);
    }, []);

    // Auto-verify when account number is 10 digits and bank is selected
    useEffect(() => {
        if (bankCode && accountNumber && accountNumber.length === 10) {
            handleVerify();
        } else {
            // Reset status if input changes to invalid state
            if (verificationStatus !== "IDLE" || errorMessage !== null) { // Check errorMessage too
                setVerificationStatus("IDLE");
                setErrorMessage(null);
                setValue(`beneficiaries.${index}.name`, ""); // Clear name
            }
        }
    }, [bankCode, accountNumber]); // Added verificationStatus and errorMessage to dependencies for completeness, though not strictly necessary for this logic

    const handleVerify = async () => {
        if (!bankCode || !accountNumber || accountNumber.length !== 10) {
            // No alert needed, auto-verify effect handles invalid state
            return;
        }

        setIsVerifying(true);
        setVerificationStatus("IDLE");
        setErrorMessage(null);

        try {
            console.log(`Verifying ${accountNumber} with bank code ${bankCode}`);
            const result = await resolveAccount(accountNumber, bankCode);
            console.log("Verification Result:", result);

            if (result && result.account_name) {
                setValue(`beneficiaries.${index}.name`, result.account_name, { shouldValidate: true, shouldDirty: true });
                setVerificationStatus("SUCCESS");
            } else {
                setVerificationStatus("ERROR");
                setErrorMessage("Could not resolve account. Please check details.");
            }
        } catch (error) {
            console.error("Verification Error:", error);
            setVerificationStatus("ERROR");
            setErrorMessage("Verification failed. Please try again.");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="grid grid-cols-12 gap-2 items-start p-3 bg-white rounded border border-gray-100 shadow-sm">
            {/* Bank Selection */}
            <div className="col-span-4">
                <select
                    {...register(`beneficiaries.${index}.bankCode`)}
                    onChange={(e) => {
                        const selectedCode = e.target.value;
                        const selectedBank = banks.find(b => b.code === selectedCode);
                        if (selectedBank) {
                            setValue(`beneficiaries.${index}.bankName`, selectedBank.name);
                        }
                        // Call original onChange from register
                        register(`beneficiaries.${index}.bankCode`).onChange(e);
                    }}
                    className="w-full text-xs border rounded p-2 bg-white"
                >
                    <option value="">Select Bank</option>
                    {banks.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                            {bank.name}
                        </option>
                    ))}
                </select>
                {/* Hidden input to store bank name for display/record */}
                <input type="hidden" {...register(`beneficiaries.${index}.bankName`)} />
            </div>

            {/* Account Number & Verify */}
            <div className="col-span-4 relative">
                <input
                    {...register(`beneficiaries.${index}.accountNumber`)}
                    placeholder="Acct No."
                    className={`w-full text-xs border rounded p-2 pr-8 ${verificationStatus === "SUCCESS" ? "border-green-500 bg-green-50" :
                            verificationStatus === "ERROR" ? "border-red-500 bg-red-50" : ""
                        }`}
                    maxLength={10}
                // Removed manual onChange to reset verification, as auto-verify useEffect handles it
                />
                <div className="absolute right-2 top-2">
                    {isVerifying ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />
                    ) : verificationStatus === "SUCCESS" ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    ) : verificationStatus === "ERROR" ? (
                        <XCircleIcon className="w-4 h-4 text-red-600" />
                    ) : null}
                </div>
                {errorMessage && (
                    <p className="text-[10px] text-red-500 mt-1 absolute -bottom-4 left-0 w-full truncate" title={errorMessage}>
                        {errorMessage}
                    </p>
                )}
            </div>

            {/* Account Name (Read Only or Editable) */}
            <div className="col-span-4">
                <input
                    {...register(`beneficiaries.${index}.name`)}
                    placeholder="Account Name"
                    className="w-full text-xs border rounded p-2 bg-gray-50 font-medium text-gray-700"
                    readOnly
                />
            </div>

            {/* Amount */}
            <div className="col-span-11 mt-2">
                <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Amount:</label>
                    <input
                        type="number"
                        {...register(`beneficiaries.${index}.amount`, { valueAsNumber: true })}
                        placeholder="0.00"
                        className="flex-1 text-xs border rounded p-2 font-mono"
                    />
                </div>
            </div>

            {/* Remove Button */}
            <div className="col-span-1 mt-2 flex justify-center">
                <button type="button" onClick={() => remove(index)} className="text-gray-400 hover:text-red-500 transition p-1">
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
