import { NextAuthOptions } from "next-auth"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt"

export const authOptions: NextAuthOptions = {
    // Adapter removed as we are using Credentials only and have schema conflicts with 'accounts' table

    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    pages: {
        signIn: "/login",
    },

    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // 1. Fetch User
                const db = await getDb();
                const user = await db.query.users.findFirst({
                    where: eq(users.email, credentials.email)
                });

                // 2. Check if user exists AND has a password
                if (!user || !user.password) {
                    return null;
                }

                // 3. SECURE COMPARISON using bcrypt
                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    return null;
                }

                // 4. Return the user object (filtered)
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role as "ADMIN" | "USER",
                    permissions: (user.permissions as string[]) || [],
                    image: user.image,
                    outletId: user.outletId || undefined
                };
            }
        })
    ],

    callbacks: {
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.permissions = user.permissions;
                token.outletId = user.outletId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.permissions = token.permissions;
                session.user.outletId = token.outletId as string;
            }
            return session;
        }
    }
}


export async function getAuthenticatedUser() {
    if (process.env.IS_SCRIPT === "true") {
        // BYPASS for Scripts
        const { getDb } = await import("@/db");
        const { users } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        const admin = await db.query.users.findFirst({
            where: eq(users.email, "admin@example.com")
        });
        if (admin) {
            return {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role as "ADMIN" | "USER",
                permissions: (admin.permissions as string[]) || [],
                image: admin.image,
                outletId: admin.outletId || undefined
            };
        }
    }

    const { getServerSession } = await import("next-auth");
    const session = await getServerSession(authOptions);
    return session?.user;
}
