import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/auth/password";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Bootstrap the first SuperAdmin account if none exists yet, so a fresh
  // deploy is never locked out. Set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
  // to control it; otherwise falls back to a default that MUST be changed
  // after first login.
  const adminExists = await prisma.superAdminUser.findFirst();
  if (!adminExists) {
    const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? "changeme123";
    const name = process.env.ADMIN_NAME ?? "Admin";

    await prisma.superAdminUser.create({
      data: { email, name, passwordHash: await hashPassword(password) },
    });

    console.log(`Kreye premye kont SuperAdmin: ${email}${process.env.ADMIN_PASSWORD ? "" : " (modpas default 'changeme123' — chanje l fon vit)"}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
