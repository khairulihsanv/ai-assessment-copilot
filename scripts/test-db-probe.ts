// Connectivity probe for the disposable test database. Refuses non-test URLs.
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../lib/testing/database-url";

async function main() {
  const url = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    const r = await p.$queryRawUnsafe<{ version: string; v: string | null }[]>(
      "select version(), (select extversion from pg_extension where extname='vector') as v",
    );
    console.log(r);
  } finally {
    await p.$disconnect();
  }
}
main().catch((e) => {
  console.error("ERR", String(e.message).slice(0, 400));
  process.exit(1);
});
