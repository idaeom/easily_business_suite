"use server";

import { cookies } from "next/headers";

export async function getAppMode() {
    // 1. Check Environment Variable (Priority for Scripts/Tests)
    if (process.env.APP_MODE === "LIVE") return "LIVE";
    if (process.env.APP_MODE === "TEST") return "TEST";

    // 2. Check Cookies (Web Context)
    try {
        const cookieStore = await cookies();
        const mode = cookieStore.get("app_mode")?.value;
        return mode === "LIVE" ? "LIVE" : "TEST";
    } catch (error) {
        // Fallback for non-request contexts
        return "TEST";
    }
}

export async function setAppMode(mode: "LIVE" | "TEST") {
    const cookieStore = await cookies();
    cookieStore.set("app_mode", mode, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
}
