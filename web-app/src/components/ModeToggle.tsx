"use client";

import * as React from "react";
import { Moon, Sun, FlaskConical, Radio } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setAppMode } from "@/actions/app-mode";
import { useRouter } from "next/navigation";

export function ModeToggle({ currentMode }: { currentMode: "LIVE" | "TEST" }) {
    const router = useRouter();

    const handleModeChange = async (mode: "LIVE" | "TEST") => {
        await setAppMode(mode);
        // Sign out and redirect to login to force re-authentication in new mode
        await signOut({ callbackUrl: "/login" });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className={currentMode === "TEST" ? "border-orange-500 text-orange-500" : "border-green-500 text-green-500"}>
                    {currentMode === "TEST" ? (
                        <FlaskConical className="h-[1.2rem] w-[1.2rem]" />
                    ) : (
                        <Radio className="h-[1.2rem] w-[1.2rem]" />
                    )}
                    <span className="sr-only">Toggle mode</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleModeChange("LIVE")}>
                    <Radio className="mr-2 h-4 w-4 text-green-500" />
                    Live Mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleModeChange("TEST")}>
                    <FlaskConical className="mr-2 h-4 w-4 text-orange-500" />
                    Test Mode
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
