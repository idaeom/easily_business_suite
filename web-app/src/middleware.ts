import { withAuth } from "next-auth/middleware";

export default withAuth({
    callbacks: {
        authorized: ({ req, token }) => {
            // If there is a token, the user is authenticated
            if (token) return true;
            // Otherwise, redirect to login
            return false;
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
