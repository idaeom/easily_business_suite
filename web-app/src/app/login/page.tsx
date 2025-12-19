
"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAppMode } from "@/actions/app-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError("Invalid credentials");
        } else {
            router.push("/dashboard");
        }
    };

    const [mode, setMode] = useState<"LIVE" | "TEST">("LIVE");

    useEffect(() => {
        // Read cookie on mount to set initial mode
        const match = document.cookie.match(new RegExp('(^| )app_mode=([^;]+)'));
        if (match) {
            const cookieMode = match[2] as "LIVE" | "TEST";
            if (cookieMode === "LIVE" || cookieMode === "TEST") {
                setMode(cookieMode);
            }
        }
    }, []);

    const toggleMode = async () => {
        const newMode = mode === "LIVE" ? "TEST" : "LIVE";
        setMode(newMode);
        // Update server-side cookie via action to ensure consistency
        await setAppMode(newMode);
    };

    return (
        <div className={`flex h-screen items-center justify-center transition-colors duration-500 ${mode === "TEST" ? "bg-orange-50" : "bg-gray-100"}`}>
            <Card className={`w-full max-w-md transition-all duration-500 ${mode === "TEST" ? "border-orange-500 shadow-orange-200" : ""}`}>
                <CardHeader>
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={toggleMode}
                            className={`text-xs font-bold px-2 py-1 rounded border ${mode === "TEST" ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}
                        >
                            {mode} MODE
                        </button>
                    </div>
                    <CardTitle className="text-center">
                        {mode === "TEST" ? "Test Environment Login" : "Sign In"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className={`w-full ${mode === "TEST" ? "bg-orange-600 hover:bg-orange-700" : ""}`}>
                            Sign In
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
