/**
 * Local, disposable PostgreSQL (PGlite = real Postgres compiled to WASM) with the
 * real `vector` extension, exposed on a TCP socket so Prisma can connect.
 *
 * Automatically applies existing migrations from prisma/migrations in order.
 * Patches execProtocolRawStream to auto-deallocate re-parsed statement names (e.g. Prisma's "s0"),
 * preventing "42P05: prepared statement already exists" in PGlite single-session wire protocol.
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
import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.TEST_DB_PORT ?? 54329);
const dataDir = process.env.TEST_DB_DIR; // undefined => in-memory

const MIGRATIONS = [
  "0_init",
  "20261002035300_paket_b_history",
  "20261002060000_reference_documents",
  "20261004100000_rag_pipeline",
];

function extractPreparedStatements(buf: Uint8Array): string[] {
  const names: string[] = [];
  let offset = 0;
  while (offset < buf.length) {
    const type = buf[offset];
    if (offset + 4 >= buf.length) break;
    const len =
      (buf[offset + 1] << 24) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 8) |
      buf[offset + 4];
    if (len < 4) break;

    if (type === 0x50) { // 'P' = Parse
      let nullIndex = offset + 5;
      while (nullIndex < offset + 1 + len && buf[nullIndex] !== 0) {
        nullIndex++;
      }
      if (nullIndex > offset + 5 && nullIndex < offset + 1 + len) {
        const stmtName = Buffer.from(buf.subarray(offset + 5, nullIndex)).toString("utf-8");
        if (stmtName.length > 0) {
          names.push(stmtName);
        }
      }
    }
    offset += 1 + len;
  }
  return names;
}

async function applyMigrations(db: PGlite) {
  console.log("[test-db] Initializing pgvector extension...");
  await db.exec("CREATE EXTENSION IF NOT EXISTS vector;");

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  for (const migrationName of MIGRATIONS) {
    const migrationFile = path.join(migrationsDir, migrationName, "migration.sql");
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    const sql = fs.readFileSync(migrationFile, "utf-8");
    console.log(`[test-db] Applying migration: ${migrationName}`);
    await db.exec(sql);
  }
  console.log("[test-db] All schema migrations applied successfully.");
}

async function main() {
  const db = await PGlite.create({ dataDir, extensions: { vector } });
  
  await applyMigrations(db);

  // Patch execProtocolRawStream on PGlite instance to handle Prisma statement reuse
  const originalExecProtocolRawStream = (db as any).execProtocolRawStream.bind(db);
  (db as any).execProtocolRawStream = async (message: Uint8Array, options: any) => {
    const stmtNames = extractPreparedStatements(message);
    for (const name of stmtNames) {
      try {
        await db.exec(`DEALLOCATE "${name.replace(/"/g, '""')}";`);
      } catch {
        // Ignored if statement was not yet allocated
      }
    }
    return originalExecProtocolRawStream(message, options);
  };

  const server = new PGLiteSocketServer({
    db,
    port,
    host: "127.0.0.1",
    maxConnections: Number(process.env.TEST_DB_MAX_CONNECTIONS ?? 50),
  });
  
  await server.start();
  console.log(`[test-db] PGlite+pgvector listening on 127.0.0.1:${port}`);
  
  const stop = async () => {
    console.log("[test-db] Stopping server and closing database...");
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
