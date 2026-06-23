import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const email = "admin@woreda11.gov.et";
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log("Admin user already exists, skipping.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("Admin@1234", 12);

  const [admin] = await db.insert(usersTable).values({
    username: "admin",
    fullName: "System Administrator",
    email,
    passwordHash,
    role: "admin",
    isActive: true,
  }).returning();

  console.log("Created admin user:", admin.id);
  console.log("Email:", email);
  console.log("Password: Admin@1234");
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
