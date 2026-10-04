import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let databaseUrl = process.env.DATABASE_URL;

// CRITICAL FIX: If using Neon pooler, Prisma REQUIRES pgbouncer=true.
// If the user forgot to add it in Vercel env, it will hang indefinitely.
if (databaseUrl && databaseUrl.includes("-pooler.") && !databaseUrl.includes("pgbouncer=true")) {
  databaseUrl += databaseUrl.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
