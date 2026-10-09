/**
 * Local, disposable PostgreSQL (PGlite = real Postgres compiled to WASM) with the
 * real `vector` extension, exposed on a TCP socket so Prisma can connect.
 *
 * LIMITS (be honest in reports):
 *  - PGlite is single-connection/single-process. It is valid for functional,
 *    SQL-correctness and EXPLAIN checks. It is NOT valid for concurrency or
 *    load-capacity claims. Use a real PostgreSQL+pgvector for those.
 *  - Binds to 127.0.0.1 only. Data is in memory unless TEST_DB_DIR is set.
 *
 * Usage: npx tsx scripts/test-db-server.ts   (port TEST_DB_PORT, default 54329)
 * URL:   postgresql://test_user:test_password@127.0.0.1:54329/test_db?schema=public
 */
// @ts-ignore
import { PGlite } from "@electric-sql/pglite";
// @ts-ignore
import { vector } from "@electric-sql/pglite-pgvector";
// @ts-ignore
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.TEST_DB_PORT ?? 54329);
const dataDir = process.env.TEST_DB_DIR; // undefined => in-memory

async function main() {
  const db = await PGlite.create({ dataDir, extensions: { vector } });
  await db.exec("CREATE EXTENSION IF NOT EXISTS vector;");
  const server = new PGLiteSocketServer({
    db,
    port,
    host: "127.0.0.1",
    maxConnections: Number(process.env.TEST_DB_MAX_CONNECTIONS ?? 20),
  });
  await server.start();
  console.log(`[test-db] PGlite+pgvector listening on 127.0.0.1:${port}`);
  const stop = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error("[test-db] failed:", e);
  process.exit(1);
});
