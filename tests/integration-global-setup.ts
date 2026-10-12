import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

let backendProcess: ChildProcess | null = null;

async function isBackendHealthy(port = 3001): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function setup() {
  const isHealthy = await isBackendHealthy(3001);
  if (isHealthy) {
    console.log("[integration-setup] Backend is already running and healthy.");
    return;
  }

  console.log("[integration-setup] Spawning backend for integration tests...");
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    throw new Error("TEST_DATABASE_URL is required for integration tests");
  }

  const backendEnv = {
    ...process.env,
    PORT: "3001",
    DATABASE_URL: testDbUrl,
    TEST_DATABASE_URL: testDbUrl,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET || "test-internal-secret-integration",
    ALLOW_STUB_PROVIDERS: "true",
  };

  process.env.INTERNAL_API_SECRET = backendEnv.INTERNAL_API_SECRET;
  process.env.BACKEND_URL = "http://127.0.0.1:3001";

  backendProcess = spawn("node", ["dist/index.js"], {
    cwd: path.resolve(process.cwd(), "apps/backend"),
    env: backendEnv,
    stdio: "ignore",
    shell: true,
  });

  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await isBackendHealthy(3001)) {
      console.log("[integration-setup] Backend is ready for integration tests.");
      return;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error("[integration-setup] Backend failed to start within 15 seconds.");
}

export async function teardown() {
  if (backendProcess && backendProcess.pid) {
    console.log("[integration-setup] Tearing down spawned backend...");
    if (process.platform === "win32") {
      try {
        spawn("taskkill", ["/pid", String(backendProcess.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        // ignore
      }
    } else {
      try {
        backendProcess.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
  }
}
