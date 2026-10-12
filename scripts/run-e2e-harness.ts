/**
 * Master E2E Test Harness for Dexa Assessment
 *
 * Automates:
 * 1. Database validation and migration on isolated test DB
 * 2. Deterministic fixture seeding
 * 3. AI stub server startup
 * 4. Backend server startup (compiled dist)
 * 5. Frontend server startup
 * 6. Playwright E2E execution
 * 7. Graceful resource cleanup
 */

import { type ChildProcess, spawn } from "node:child_process";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../apps/frontend/src/server/config/database-url.js";
import { startAiStubServer } from "./ai-stub-server.js";
import { seedE2EFixtures } from "./e2e-seed.js";

// Utility to find free TCP port
async function getFreePort(startingPort = 3000): Promise<number> {
  let port = startingPort;
  while (port < 65535) {
    const isFree = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(true));
      });
    });
    if (isFree) return port;
    port++;
  }
  throw new Error("No free port available");
}

// Utility to poll an HTTP URL until it succeeds
async function waitForUrl(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 401 || res.status === 307 || res.status === 200) {
        return true;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log("====================================================");
  console.log("   DEXA ASSESSMENT E2E VERIFICATION HARNESS         ");
  console.log("====================================================");

  // 1. Verify Test Database URL
  const testDbUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://test_user:test_password@127.0.0.1:54321/test_db?schema=public&sslmode=disable";

  requireTestDatabaseUrl(testDbUrl);
  process.env.DATABASE_URL = testDbUrl;
  process.env.TEST_DATABASE_URL = testDbUrl;
  console.log("[Harness] Test Database target validated (loopback isolated).");

  // 2. Generate Random Secrets for this test session
  const authSecret = crypto.randomBytes(32).toString("hex");
  const internalSecret = crypto.randomBytes(32).toString("hex");
  console.log("[Harness] Ephemeral random test secrets generated.");

  // 3. Find available ports
  const backendPort = await getFreePort(3001);
  const aiStubPort = await getFreePort(3002);
  const frontendPort = await getFreePort(3000);
  console.log(
    `[Harness] Ports allocated -> Frontend: ${frontendPort}, Backend: ${backendPort}, AI Stub: ${aiStubPort}`,
  );

  // 4. Seed Database Fixtures
  console.log("[Harness] Seeding deterministic fixtures...");
  const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
  try {
    await seedE2EFixtures(prisma);
    console.log("[Harness] Fixtures seeded successfully.");
  } finally {
    await prisma.$disconnect();
  }

  // 5. Start AI Stub Server
  console.log("[Harness] Starting AI Stub Server...");
  const aiStubServer = await startAiStubServer(aiStubPort);

  // 6. Start Backend Hono Server (compiled build)
  console.log("[Harness] Starting Backend server (dist/index.js)...");
  const backendEnv = {
    ...process.env,
    PORT: String(backendPort),
    DATABASE_URL: testDbUrl,
    TEST_DATABASE_URL: testDbUrl,
    INTERNAL_API_SECRET: internalSecret,
    GROQ_API_URL: `http://127.0.0.1:${aiStubPort}/v1/chat/completions`,
    GROQ_API_KEY: "stub-test-key",
    ALLOW_STUB_PROVIDERS: "true",
    LLM_PROVIDER: "stub",
    EMBEDDING_PROVIDER: "stub",
  };

  const backendProcess: ChildProcess = spawn("node", ["dist/index.js"], {
    cwd: path.resolve(process.cwd(), "apps/backend"),
    env: backendEnv,
    stdio: "inherit",
    shell: true,
  });

  const backendReady = await waitForUrl(`http://127.0.0.1:${backendPort}/health`, 20000);
  if (!backendReady) {
    throw new Error(
      `[Harness] Backend failed to become healthy at http://127.0.0.1:${backendPort}/health`,
    );
  }
  console.log("[Harness] Backend is ready & healthy.");

  // 7. Start Frontend Next.js Server
  console.log(`[Harness] Starting Frontend server on port ${frontendPort}...`);
  const frontendEnv = {
    ...process.env,
    PORT: String(frontendPort),
    DATABASE_URL: testDbUrl,
    TEST_DATABASE_URL: testDbUrl,
    AUTH_SECRET: authSecret,
    INTERNAL_API_SECRET: internalSecret,
    BACKEND_URL: `http://127.0.0.1:${backendPort}`,
    ALLOW_STUB_PROVIDERS: "true",
  };

  const frontendProcess: ChildProcess = spawn(
    "npx",
    ["next", "start", "-p", String(frontendPort)],
    {
      cwd: path.resolve(process.cwd(), "apps/frontend"),
      env: frontendEnv,
      stdio: "inherit",
      shell: true,
    },
  );

  const frontendReady = await waitForUrl(`http://127.0.0.1:${frontendPort}/login`, 30000);
  if (!frontendReady) {
    throw new Error(
      `[Harness] Frontend failed to respond at http://127.0.0.1:${frontendPort}/login`,
    );
  }
  console.log("[Harness] Frontend is ready.");

  // 8. Run Playwright E2E Tests
  console.log("\n[Harness] Launching Playwright E2E Test Suite...\n");
  const playwrightEnv = {
    ...process.env,
    BASE_URL: `http://127.0.0.1:${frontendPort}`,
    FRONTEND_PORT: String(frontendPort),
    BACKEND_URL: `http://127.0.0.1:${backendPort}`,
    INTERNAL_API_SECRET: internalSecret,
    DATABASE_URL: testDbUrl,
    TEST_DATABASE_URL: testDbUrl,
  };

  const playwrightArgs = process.argv.slice(2);
  const testArgs = playwrightArgs.length > 0 ? playwrightArgs : ["playwright", "test"];

  let exitCode = 0;
  try {
    exitCode = await new Promise<number>((resolve) => {
      const pw = spawn("npx", testArgs, {
        env: playwrightEnv,
        stdio: "inherit",
        shell: true,
      });
      pw.on("exit", (code) => resolve(code ?? 1));
      pw.on("error", (err) => {
        console.error("[Harness] Playwright execution error:", err);
        resolve(1);
      });
    });
  } finally {
    // 9. Cleanup all spawned processes
    console.log("\n[Harness] Cleaning up spawned processes...");
    aiStubServer.close();

    const killProcess = (proc: ChildProcess) => {
      if (!proc.pid) return;
      if (process.platform === "win32") {
        try {
          spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
        } catch {
          // ignore
        }
      } else {
        try {
          proc.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    };

    killProcess(backendProcess);
    killProcess(frontendProcess);
  }

  console.log(`[Harness] Completed with exit code: ${exitCode}`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[Harness Fatal Error]:", err);
  process.exit(1);
});
