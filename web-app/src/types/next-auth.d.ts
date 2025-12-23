
import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "CASHIER" | "USER"
            permissions: string[]
            outletId?: string
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "CASHIER" | "USER"
        permissions: string[]
        outletId?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "CASHIER" | "USER"
        permissions: string[]
        outletId?: string
    }
}
