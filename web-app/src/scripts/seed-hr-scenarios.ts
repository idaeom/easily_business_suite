
import { getDb } from "../db";
import { users, employeeProfiles, teams } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function main() {
    const db = await getDb();
    console.log("Seeding HR Scenarios...");

    const hashedPassword = await bcrypt.hash("password", 10);

    // 1. Create Teams/Departments if they don't exist
    const depts = ["Engineering", "Sales", "Marketing", "HR"];
    const deptIds: Record<string, string> = {};

    for (const d of depts) {
        let team = await db.query.teams.findFirst({ where: eq(teams.name, d) });
        if (!team) {
            const [newTeam] = await db.insert(teams).values({
                name: d,
                type: "DEPARTMENT",
                description: `${d} Department`
            }).returning();
            team = newTeam;
        }
        deptIds[d] = team.id;
    }

    // 2. Define Scenario Users
    const scenarios = [
        // ON PAYROLL
        {
            name: "Alice Johnson", email: "alice@test.com", role: "USER", dept: "Engineering",
            profile: { jobTitle: "Senior Engineer", basicSalary: 800000, housing: 200000, transport: 100000 }
        },
        {
            name: "Bob Smith", email: "bob@test.com", role: "USER", dept: "Sales",
            profile: { jobTitle: "Sales Lead", basicSalary: 600000, housing: 150000, transport: 150000 }
        },
        {
            name: "Charlie Brown", email: "charlie@test.com", role: "USER", dept: "Marketing",
            profile: { jobTitle: "Content Strategist", basicSalary: 400000, housing: 100000, transport: 50000 }
        },
        {
            name: "Diana Prince", email: "diana@test.com", role: "USER", dept: "Engineering",
            profile: { jobTitle: "QA Engineer", basicSalary: 350000, housing: 80000, transport: 40000 }
        },
        {
            name: "Evan Wright", email: "evan@test.com", role: "USER", dept: "Engineering",
            profile: { jobTitle: "Backend Dev", basicSalary: 550000, housing: 120000, transport: 80000 }
        },

        // NOT ON PAYROLL (Contractors / New Hires)
        {
            name: "Frank Castle", email: "frank@test.com", role: "USER", dept: "Sales",
            profile: null // Contract staff, no payroll profile yet
        },
        {
            name: "Grace Hopper", email: "grace@test.com", role: "USER", dept: "Engineering",
            profile: null // Intern
        },
        {
            name: "Hank Pym", email: "hank@test.com", role: "USER", dept: "marketing", // Lowercase check
            profile: null // Vendor
        }
    ];

    for (const s of scenarios) {
        // Create User
        let user = await db.query.users.findFirst({ where: eq(users.email, s.email) });
        if (!user) {
            const [newUser] = await db.insert(users).values({
                name: s.name,
                email: s.email,
                role: s.role as any,
                password: hashedPassword,
                image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.name.replace(" ", "")}`,
                teamId: deptIds[s.dept] || deptIds["Engineering"] // Fallback
            }).returning();
            user = newUser;
            console.log(`Created User: ${s.name} (${s.email})`);
        } else {
            console.log(`User exists: ${s.name}`);
        }

        // Handle Profile
        if (s.profile) {
            const existingProfile = await db.query.employeeProfiles.findFirst({ where: eq(employeeProfiles.userId, user.id) });
            if (!existingProfile) {
                await db.insert(employeeProfiles).values({
                    userId: user.id,
                    jobTitle: s.profile.jobTitle,
                    employmentType: "FULL_TIME",
                    basicSalary: s.profile.basicSalary.toString(),
                    housingAllowance: s.profile.housing.toString(),
                    transportAllowance: s.profile.transport.toString(),
                    otherAllowances: "0",
                    bankName: "Zenith Bank",
                    accountNumber: "0000000000", // Dummy
                    taxId: "TAX-0000",
                    pensionId: "PEN-0000"
                });
                console.log(`  -> Created Payroll Profile for ${s.name}`);
            } else {
                // Update implementation plan to just note skip
                console.log(`  -> Profile exists for ${s.name}`);
            }
        } else {
            // Ensure no profile exists if they shouldn't have one (optional, but good for reset)
            console.log(`  -> Skipped Profile for ${s.name} (Not on Payroll)`);
        }
    }

    console.log("HR Scenarios Seeded Successfully.");
    process.exit(0);
}

main().catch(console.error);
