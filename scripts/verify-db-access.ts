import { PrismaClient } from "@prisma/client";

type ErrorClassification =
  | "AUTH_OR_HBA_REJECTION"
  | "SQL_ERROR"
  | "TIMEOUT"
  | "CONNECTION_REFUSED"
  | "UNKNOWN";

interface CheckResult {
  name: string;
  urlSafe: string;
  connected: boolean;
  queryResult: any;
  error?: {
    code?: string;
    message: string;
    classification: ErrorClassification;
  };
}

function classifyError(err: any): ErrorClassification {
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "");

  if (
    code === "P1000" || // Authentication failed against database server
    code === "P1010" || // User was denied access on the database
    msg.includes("pg_hba.conf") ||
    msg.includes("password authentication failed") ||
    msg.includes("no pg_hba.conf entry") ||
    msg.includes("denied access on the database") ||
    msg.includes("denied access") ||
    msg.includes("authentication failed")
  ) {
    return "AUTH_OR_HBA_REJECTION";
  }
  if (code === "P1001" || msg.includes("can't reach database server")) {
    return "CONNECTION_REFUSED";
  }
  if (msg.includes("timeout")) {
    return "TIMEOUT";
  }
  if (msg.includes("syntax") || msg.includes("relation") || msg.includes("table")) {
    return "SQL_ERROR";
  }
  return "UNKNOWN";
}

async function testConnection(name: string, url: string, urlSafe: string): Promise<CheckResult> {
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });

  try {
    const res = await client.$queryRawUnsafe("SELECT 1 AS alive");
    await client.$disconnect();
    return {
      name,
      urlSafe,
      connected: true,
      queryResult: res,
    };
  } catch (err: any) {
    await client.$disconnect().catch(() => {});
    return {
      name,
      urlSafe,
      connected: false,
      queryResult: null,
      error: {
        code: err?.code,
        message: err?.message?.split("\n").slice(-2).join(" ").trim() || String(err),
        classification: classifyError(err),
      },
    };
  }
}

async function main() {
  console.log("=== VERIFIKASI PEMBATASAN AKSES POSTGRESQL (SELECT 1) ===\n");

  // 1. Kontrol Positif: test_user pada test_db (harus SUKSES)
  const posUrl =
    "postgresql://test_user:test_password@127.0.0.1:54321/test_db?schema=public&sslmode=disable";
  const posSafe = "postgresql://test_user:***@127.0.0.1:54321/test_db";
  const posResult = await testConnection("KONTROL POSITIF: test_user -> test_db", posUrl, posSafe);
  console.log(`[1] ${posResult.name}`);
  console.log(`    Status: ${posResult.connected ? "SUCCESS (PASS)" : "FAILED (FAIL)"}`);
  console.log(`    Result:`, posResult.queryResult || posResult.error);
  console.log();

  // 2. Kontrol Negatif 1: test_user mencoba akses database postgres (harus DITOLAK oleh pg_hba)
  const negDbUrl = "postgresql://test_user:test_password@127.0.0.1:54321/postgres?sslmode=disable";
  const negDbSafe = "postgresql://test_user:***@127.0.0.1:54321/postgres";
  const negDbResult = await testConnection(
    "KONTROL NEGATIF 1: test_user -> postgres (db lain)",
    negDbUrl,
    negDbSafe,
  );
  console.log(`[2] ${negDbResult.name}`);
  console.log(
    `    Status: ${!negDbResult.connected && negDbResult.error?.classification === "AUTH_OR_HBA_REJECTION" ? "DITOLAK OLEH PG_HBA (PASS)" : "UNEXPECTED"}`,
  );
  console.log(`    Classification:`, negDbResult.error?.classification);
  console.log(`    Error Message:`, negDbResult.error?.message);
  console.log();

  // 3. Kontrol Negatif 2: role postgres via TCP proxy (harus DITOLAK oleh pg_hba)
  const negUserUrl =
    "postgresql://postgres:random_pwd_check@127.0.0.1:54321/postgres?sslmode=disable";
  const negUserSafe = "postgresql://postgres:***@127.0.0.1:54321/postgres";
  const negUserResult = await testConnection(
    "KONTROL NEGATIF 2: postgres user via TCP",
    negUserUrl,
    negUserSafe,
  );
  console.log(`[3] ${negUserResult.name}`);
  console.log(
    `    Status: ${!negUserResult.connected && negUserResult.error?.classification === "AUTH_OR_HBA_REJECTION" ? "DITOLAK OLEH PG_HBA (PASS)" : "UNEXPECTED"}`,
  );
  console.log(`    Classification:`, negUserResult.error?.classification);
  console.log(`    Error Message:`, negUserResult.error?.message);
  console.log();

  const allPassed =
    posResult.connected &&
    !negDbResult.connected &&
    negDbResult.error?.classification === "AUTH_OR_HBA_REJECTION" &&
    !negUserResult.connected &&
    negUserResult.error?.classification === "AUTH_OR_HBA_REJECTION";

  console.log(
    `HASIL VERIFIKASI DATABASE: ${allPassed ? "SEMUA KONTROL VALID (LULUS)" : "ADA KETIDAKSESUAIAN"}`,
  );
  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
