/**
 * Master E2E Test Harness for Dexa Assessment
 *
 * Automates:
 * 1. Database validation and migration on isolated test DB (Alembic before seed)
 * 2. Deterministic fixture seeding
 * 3. AI stub server startup
 * 4. Backend FastAPI server startup via Uvicorn
 * 5. Frontend Next.js server startup
 * 6. Playwright target verification (--list) and execution (handles Windows quotes & spaces)
 * 7. Guaranteed process cleanup on success, test failure, and startup failure
 */

import { type ChildProcess, execSync, spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../apps/frontend/src/server/config/database-url.js";
import { startAiStubServer } from "./ai-stub-server.js";
import { seedE2EFixtures } from "./e2e-seed.js";

// Utility to mask credentials in database URLs for secure logging
function maskDatabaseUrl(url: string): string {
  return url.replace(/:\/\/[^:]+:([^@]+)@/, "://***:***@");
}

// Utility to find free TCP port with exclusion set and active connection test
async function isPortAvailable(port: number): Promise<boolean> {
  const canConnect = await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(250);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true); // Connected means port is busy!
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });

  if (canConnect) return false;

  return await new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ port, host: "127.0.0.1", exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function getFreePort(startingPort = 3010, excludePorts: number[] = []): Promise<number> {
  let port = startingPort;
  while (port < 65535) {
    if (excludePorts.includes(port)) {
      port++;
      continue;
    }
    const available = await isPortAvailable(port);
    if (available) return port;
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

  // 1. Verify Test Database URL & Mask Credentials in Logs
  const testDbUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://postgres:password@127.0.0.1:5432/ai_assessment_test";

  requireTestDatabaseUrl(testDbUrl);
  process.env.DATABASE_URL = testDbUrl;
  process.env.TEST_DATABASE_URL = testDbUrl;
  console.log(
    "[Harness] Test Database target validated (loopback isolated):",
    maskDatabaseUrl(testDbUrl),
  );

  // 2. Run Alembic Migrations on isolated test DB before seeding
  console.log("[Harness] Running Alembic migrations on isolated test DB...");
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  execSync(`${pythonBin} -m alembic upgrade head`, {
    cwd: path.resolve(process.cwd(), "apps/backend"),
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      TEST_DATABASE_URL: testDbUrl,
    },
    stdio: "inherit",
  });
  console.log("[Harness] Alembic migrations completed successfully.");

  // 3. Generate Random Secrets for this test session (consistent across frontend & FastAPI)
  const authSecret = crypto.randomBytes(32).toString("hex");
  console.log("[Harness] Ephemeral random test secrets generated (32+ chars).");

  // 4. Find available ports (avoiding collisions and dev server ports)
  const allocatedPorts: number[] = [3000, 3001];
  const backendPort = await getFreePort(3011, allocatedPorts);
  allocatedPorts.push(backendPort);
  const aiStubPort = await getFreePort(3012, allocatedPorts);
  allocatedPorts.push(aiStubPort);
  const frontendPort = await getFreePort(3010, allocatedPorts);
  allocatedPorts.push(frontendPort);
  console.log(
    `[Harness] Ports allocated -> Frontend: ${frontendPort}, Backend (FastAPI): ${backendPort}, AI Stub: ${aiStubPort}`,
  );

  // 5. Seed Database Fixtures
  console.log("[Harness] Seeding deterministic fixtures into isolated test DB...");
  const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
  try {
    await seedE2EFixtures(prisma);
    console.log("[Harness] Fixtures seeded successfully.");
  } finally {
    await prisma.$disconnect();
  }

  // Lifecycle variables for guaranteed cleanup
  let aiStubServer: { close: () => void } | null = null;
  let backendProcess: ChildProcess | null = null;
  let frontendProcess: ChildProcess | null = null;

  const killProcess = (proc: ChildProcess | null) => {
    if (!proc || !proc.pid) return;
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
      } catch {
        // ignore if already exited
      }
    } else {
      try {
        proc.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
  };

  let exitCode = 0;

  try {
    // 6. Start AI Stub Server
    console.log("[Harness] Starting AI Stub Server...");
    aiStubServer = await startAiStubServer(aiStubPort);

    // 7. Start FastAPI Backend Server via Uvicorn
    console.log(`[Harness] Starting FastAPI Backend server on port ${backendPort}...`);
    const backendEnv = {
      ...process.env,
      PORT: String(backendPort),
      DATABASE_URL: testDbUrl,
      TEST_DATABASE_URL: testDbUrl,
      SECRET_KEY: authSecret,
      INTERNAL_API_SECRET: authSecret,
      GROQ_API_URL: `http://127.0.0.1:${aiStubPort}/v1/chat/completions`,
      GROQ_API_KEY: "stub-test-key",
      ALLOW_STUB_PROVIDERS: "true",
      LLM_PROVIDER: "mock",
      TEST_MOCK_LLM: "true",
      TEST_MOCK_EMBEDDING: "true",
      PYTHONUNBUFFERED: "1",
    };

    backendProcess = spawn(
      pythonBin,
      ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
      {
        cwd: path.resolve(process.cwd(), "apps/backend"),
        env: backendEnv,
        stdio: "inherit",
        shell: true,
      },
    );

    const backendReady = await waitForUrl(`http://127.0.0.1:${backendPort}/health`, 25000);
    if (!backendReady) {
      throw new Error(
        `[Harness] FastAPI Backend failed to become healthy at http://127.0.0.1:${backendPort}/health`,
      );
    }
    console.log("[Harness] FastAPI Backend is ready & healthy.");

    // 8. Start Frontend Next.js Server
    console.log(`[Harness] Starting Frontend server on port ${frontendPort}...`);
    const frontendEnv = {
      ...process.env,
      PORT: String(frontendPort),
      DATABASE_URL: testDbUrl,
      TEST_DATABASE_URL: testDbUrl,
      AUTH_SECRET: authSecret,
      SECRET_KEY: authSecret,
      INTERNAL_API_SECRET: authSecret,
      BACKEND_URL: `http://127.0.0.1:${backendPort}`,
      ALLOW_STUB_PROVIDERS: "true",
      COOKIE_SECURE: "false",
    };

    frontendProcess = spawn("npx", ["next", "start", "-p", String(frontendPort)], {
      cwd: path.resolve(process.cwd(), "apps/frontend"),
      env: frontendEnv,
      stdio: "inherit",
      shell: true,
    });

    const frontendReady = await waitForUrl(`http://127.0.0.1:${frontendPort}/login`, 35000);
    if (!frontendReady) {
      throw new Error(
        `[Harness] Frontend failed to respond at http://127.0.0.1:${frontendPort}/login`,
      );
    }
    console.log("[Harness] Frontend is ready.");

    // 9. Verify and Execute Playwright E2E Tests
    console.log("\n[Harness] Preparing Playwright E2E Test Suite...\n");
    const playwrightEnv = {
      ...process.env,
      BASE_URL: `http://127.0.0.1:${frontendPort}`,
      FRONTEND_PORT: String(frontendPort),
      BACKEND_URL: `http://127.0.0.1:${backendPort}`,
      INTERNAL_API_SECRET: authSecret,
      SECRET_KEY: authSecret,
      AUTH_SECRET: authSecret,
      DATABASE_URL: testDbUrl,
      TEST_DATABASE_URL: testDbUrl,
    };

    const userArgs = process.argv.slice(2);
    const playwrightCli = path.resolve(process.cwd(), "node_modules/@playwright/test/cli.js");

    // Pre-flight check: run --list to ensure targeted tests exist
    console.log(`[Harness] Verifying target tests with --list...`);
    const listResult = spawnSync(process.execPath, [playwrightCli, "test", ...userArgs, "--list"], {
      env: playwrightEnv,
      encoding: "utf-8",
    });

    if (listResult.status !== 0) {
      console.error("[Harness] Failed to list tests:", listResult.stderr || listResult.stdout);
      throw new Error(`[Harness] Playwright --list returned exit code ${listResult.status}`);
    }

    const listOutput = listResult.stdout || "";
    console.log(listOutput.trim());

    const totalMatch = listOutput.match(/Total:\s*(\d+)\s+test/i);
    const testCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    if (testCount === 0) {
      throw new Error(
        `[Harness Error: No tests found] Criteria matched 0 tests. Do not treat 0 tests as success! Args: ${userArgs.join(" ")}`,
      );
    }

    console.log(
      `\n[Harness] Target test verification PASSED (${testCount} test(s) found). Running test execution...\n`,
    );

    exitCode = await new Promise<number>((resolve) => {
      const pw = spawn(process.execPath, [playwrightCli, "test", ...userArgs], {
        env: playwrightEnv,
        stdio: "inherit",
      });
      pw.on("exit", (code) => resolve(code ?? 1));
      pw.on("error", (err) => {
        console.error("[Harness] Playwright execution error:", err);
        resolve(1);
      });
    });
  } finally {
    // 10. Clean up all spawned processes (guaranteed even if startup failed)
    console.log("\n[Harness] Cleaning up spawned processes...");
    if (aiStubServer) {
      try {
        aiStubServer.close();
      } catch {}
    }
    killProcess(backendProcess);
    killProcess(frontendProcess);
    console.log("[Harness] Cleanup complete.");
  }

  console.log(`[Harness] Completed with exit code: ${exitCode}`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[Harness Fatal Error]:", err);
  process.exit(1);
});
