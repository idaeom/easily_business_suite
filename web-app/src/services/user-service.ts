import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { CreateUserDto, UpdateUserRoleDto, UpdateUserPermissionsDto } from "@/lib/dtos/user-dtos";

export class UserService {
    static async createUser(data: CreateUserDto) {
        const db = await getDb();
        const existing = await db.query.users.findFirst({
            where: eq(users.email, data.email)
        });

        if (existing) {
            throw new Error("User with this email already exists.");
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        await db.insert(users).values({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: data.role || "USER",
            outletId: data.outletId || null,
        });
    }

    static async updateUserRole(data: UpdateUserRoleDto) {
        const db = await getDb();
        await db.update(users)
            .set({ role: data.role })
            .where(eq(users.id, data.userId));
    }

    static async updateUserPermissions(data: UpdateUserPermissionsDto) {
        const db = await getDb();
        await db.update(users)
            .set({ permissions: data.permissions })
            .where(eq(users.id, data.userId));
    }
    static async getUsers(params: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
    }) {
        const db = await getDb();
        const { ilike, or, and } = await import("drizzle-orm");
        const { count } = await import("drizzle-orm");

        const page = params.page || 1;
        const limit = params.limit || 10;
        const offset = (page - 1) * limit;

        // Build Conditions
        const conditions = [];

        if (params.search) {
            const searchLower = `%${params.search}%`;
            conditions.push(or(
                ilike(users.name, searchLower),
                ilike(users.email, searchLower)
            ));
        }

        if (params.role && params.role !== "ALL") {
            conditions.push(eq(users.role, params.role as any));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // 1. Get Data
        const data = await db.query.users.findMany({
            where: whereClause,
            limit: limit,
            offset: offset,
            orderBy: (users, { desc }) => [desc(users.createdAt)],
            with: {
                outlet: true // Include outlet relationship if needed for UI
            }
        });

        // 2. Get Total Count
        // Drizzle count query
        const [totalResult] = await db.select({ value: count() })
            .from(users)
            .where(whereClause);

        const total = totalResult.value;

        return {
            data: data.map(u => {
                const { password, ...rest } = u; // Exclude password
                return rest;
            }),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
