// Seed Test Users Script
import { getDb } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function main() {
    const db = await getDb();
    console.log("Seeding Test Users...");

    const hashedPassword = await bcrypt.hash("password", 10);

    const testUsers = [
        { name: "Admin User", email: "admin@example.com", role: "ADMIN", password: hashedPassword },
        { name: "User One", email: "user1@test.com", role: "USER", password: hashedPassword },
        { name: "Requester", email: "requester@test.com", role: "USER", password: hashedPassword },
        { name: "Approver", email: "approver@test.com", role: "ADMIN", password: hashedPassword }
    ];

    for (const u of testUsers) {
        const existing = await db.query.users.findFirst({
            where: eq(users.email, u.email)
        });

        if (!existing) {
            await db.insert(users).values({
                name: u.name,
                email: u.email,
                role: u.role as any,
                image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`,
                password: u.password,
            });
            console.log(`Created user: ${u.email}`);
        } else {
            // Update password for existing users to ensure we can log in
            await db.update(users)
                .set({ password: u.password })
                .where(eq(users.email, u.email));
            console.log(`Updated password for existing user: ${u.email}`);
        }
    }
    console.log("User Seeding Complete.");
}

main().catch(console.error);
// End of file
