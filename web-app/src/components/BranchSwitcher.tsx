
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { switchUserBranch } from "@/actions/users";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BranchSwitcherProps {
    outlets: { id: string; name: string }[];
}

export function BranchSwitcher({ outlets }: BranchSwitcherProps) {
    const { data: session, update } = useSession();
    const [open, setOpen] = React.useState(false);
    const router = useRouter();

    // Optimistic / Current State
    // session?.user?.outletId might be stale until update() return, so we rely on local state for immediate feedback
    // but better to rely on session if we trigger update
    const currentOutletId = session?.user?.outletId;
    const currentOutlet = outlets.find((o) => o.id === currentOutletId);

    const onSelect = async (outletId: string) => {
        setOpen(false);
        try {
            await switchUserBranch(outletId);
            await update(); // Refresh session
            router.refresh(); // Refresh Refresh server components
            toast.success("Switched branch");
        } catch (error) {
            toast.error("Failed to switch branch");
        }
    };

    if (!outlets || outlets.length === 0) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
                >
                    <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-4 w-4 shrink-0 opacity-50" />
                        {currentOutlet ? currentOutlet.name : "Select Branch..."}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search branch..." />
                    <CommandList>
                        <CommandEmpty>No branch found.</CommandEmpty>
                        <CommandGroup>
                            {outlets.map((outlet) => (
                                <CommandItem
                                    key={outlet.id}
                                    value={outlet.name}
                                    onSelect={() => onSelect(outlet.id)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            currentOutletId === outlet.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {outlet.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
