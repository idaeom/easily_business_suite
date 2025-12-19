import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function main() {
    const db = await getDb();
    const email = "admin@example.com";
    const password = "password";
    const hashedPassword = await bcrypt.hash(password, 10);
    const name = "Admin User";

    console.log(`Checking for user: ${email}...`);
    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (existingUser) {
        console.log("User already exists.");
        // Always update password to ensure it's hashed correctly
        console.log("Updating password and ensuring role is ADMIN...");
        await db.update(users)
            .set({
                role: "ADMIN",
                password: hashedPassword
            })
            .where(eq(users.id, existingUser.id));

        console.log("✅ Admin user updated.");
    } else {
        console.log("Creating new admin user...");
        await db.insert(users).values({
            email,
            password: hashedPassword,
            name,
            role: "ADMIN"
        });
        console.log("✅ Admin user created.");
    }

    console.log("\nLogin Credentials:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
