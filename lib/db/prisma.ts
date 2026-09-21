import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_HCFvQ49hqIoc@ep-raspy-base-b3xtlvc1-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
