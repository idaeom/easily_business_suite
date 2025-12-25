import { withAuth } from "next-auth/middleware";

// Define auth middleware separately
const authMiddleware = withAuth({
    callbacks: {
        authorized: ({ req, token }) => {
            // 1. Require Authentication
            if (!token) return false;

            const path = req.nextUrl.pathname;
            const role = token.role as string;

            // 2. Role-Based Access Control

            // Finance: Only ADMIN and ACCOUNTANT
            if (path.startsWith("/dashboard/finance")) {
                return ["ADMIN", "ACCOUNTANT"].includes(role);
            }

            // HR: Only ADMIN and MANAGER
            if (path.startsWith("/dashboard/hr")) {
                return ["ADMIN", "MANAGER"].includes(role);
            }

            // Settings: Only ADMIN
            if (path.startsWith("/dashboard/settings")) {
                return role === "ADMIN";
            }

            // POS: ADMIN, MANAGER, CASHIER
            // Note: POS is usually public/kiosk, but if under dashboard, restrict it.
            if (path.startsWith("/dashboard/pos")) {
                return ["ADMIN", "MANAGER", "CASHIER"].includes(role);
            }

            // Default: Allow access to other dashboard areas (e.g. Home, Tasks)
            return true;
        },
    },
});

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export default async function middleware(req: NextRequest) {
    const ip = (req as any).ip || req.headers.get("x-forwarded-for") || "127.0.0.1";

    // Rate Limiting Configuration
    // Auth Routes: Strict (10 req/min)
    // Other Routes: Loose (100 req/min)
    const isAuth = req.nextUrl.pathname.startsWith("/api/auth");
    const limitConfig = isAuth
        ? { interval: 60 * 1000, limit: 10 }
        : { interval: 60 * 1000, limit: 100 };

    const { success } = rateLimit(ip, limitConfig);

    if (!success) {
        return new NextResponse("Too Many Requests", { status: 429 });
    }

    // @ts-ignore - Next-Auth types mismatch with NextMiddleware sometimes
    return authMiddleware(req);
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/api/tasks/:path*",
        "/api/expenses/:path*",
        "/api/dashboard/:path*",
        // Exclude /api/auth/* (login, etc)
    ],
};
