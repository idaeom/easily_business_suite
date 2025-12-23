import { withAuth } from "next-auth/middleware";

export default withAuth({
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

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/api/tasks/:path*",
        "/api/expenses/:path*",
        "/api/dashboard/:path*",
        // Exclude /api/auth/* (login, etc)
    ],
};
