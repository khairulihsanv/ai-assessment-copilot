import { type ChildProcess, execSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import { requireTestDatabaseUrl } from "../apps/frontend/src/server/config/database-url";

let backendProcess: ChildProcess | null = null;
const backendUrlFile = path.resolve(__dirname, ".integration-backend-url");

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(250);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true); // Someone is listening
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false); // Connection refused => free
    });
    socket.connect(port, "127.0.0.1");
  });
}

async function getFreePort(startingPort = 3021, excludePorts: number[] = []): Promise<number> {
  let port = startingPort;
  while (port < 65535) {
    if (excludePorts.includes(port)) {
      port++;
      continue;
    }
    const busy = await isPortInUse(port);
    if (!busy) return port;
    port++;
  }
  throw new Error("No free port available for integration test backend.");
}

async function isBackendHealthy(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function setup() {
  const rawUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://postgres:password@127.0.0.1:5432/ai_assessment_test";
  const testDbUrl = requireTestDatabaseUrl(rawUrl);
  process.env.TEST_DATABASE_URL = testDbUrl;
  process.env.DATABASE_URL = testDbUrl;

  // Consistent secrets for both frontend token signing and FastAPI token verification
  const authSecret =
    process.env.INTERNAL_API_SECRET ||
    process.env.SECRET_KEY ||
    "dexa-assessment-secure-auth-secret-key-32chars-min-2026";
  process.env.INTERNAL_API_SECRET = authSecret;
  process.env.SECRET_KEY = authSecret;
  process.env.JWT_SECRET_KEY = authSecret;

  // 1. Run Alembic migrations on isolated test DB.
  // Requirement: If migration fails, halt suite with nonzero exit code.
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  try {
    execSync(`${pythonBin} -m alembic upgrade head`, {
      cwd: path.resolve(process.cwd(), "apps/backend"),
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
        TEST_DATABASE_URL: testDbUrl,
      },
      stdio: "pipe",
    });
  } catch (err) {
    console.error("[integration-setup] Alembic migration failed:", err);
    throw new Error(
      `[integration-setup] Alembic migration failed on isolated test DB: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 2. Select a free port dynamically (never kill unrelated processes on ports!)
  const backendPort = await getFreePort(3021, [3000, 3001, 3010, 3011, 3012]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  process.env.BACKEND_URL = backendUrl;
  fs.writeFileSync(backendUrlFile, backendUrl, "utf-8");

  console.log(
    `[integration-setup] Starting isolated FastAPI Backend server on dynamic port ${backendPort}...`,
  );

  const backendEnv = {
    ...process.env,
    PORT: String(backendPort),
    DATABASE_URL: testDbUrl,
    TEST_DATABASE_URL: testDbUrl,
    SECRET_KEY: authSecret,
    INTERNAL_API_SECRET: authSecret,
    JWT_SECRET_KEY: authSecret,
    ALLOW_STUB_PROVIDERS: "true",
    LLM_PROVIDER: "mock",
    TEST_MOCK_LLM: "true",
    TEST_MOCK_EMBEDDING: "true",
    PYTHONUNBUFFERED: "1",
  };

  try {
    backendProcess = spawn(
      pythonBin,
      ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
      {
        cwd: path.resolve(process.cwd(), "apps/backend"),
        env: backendEnv,
        stdio: "inherit",
        shell: false,
      },
    );

    const onProcessExit = () => {
      teardown().catch(() => {});
    };
    process.once("exit", onProcessExit);
    process.once("SIGINT", onProcessExit);
    process.once("SIGTERM", onProcessExit);

    // Wait until backend is healthy
    const start = Date.now();
    let healthy = false;
    while (Date.now() - start < 15000) {
      if (await isBackendHealthy(backendPort)) {
        healthy = true;
        console.log(
          `[integration-setup] FastAPI Backend is healthy & ready on port ${backendPort}.`,
        );
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    if (!healthy) {
      throw new Error(
        `[integration-setup] FastAPI Backend failed to start on port ${backendPort} within 15 seconds.`,
      );
    }
  } catch (startupError) {
    // Requirement: Pastikan cleanup tetap berjalan ketika startup gagal
    console.error(
      "[integration-setup] Startup failure detected, executing cleanup...",
      startupError,
    );
    await teardown();
    throw startupError;
  }
}

export async function teardown() {
  if (backendProcess && backendProcess.pid) {
    console.log(
      `[integration-setup] Tearing down spawned FastAPI backend process (PID: ${backendProcess.pid})...`,
    );
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /pid ${backendProcess.pid} /T /F`, { stdio: "ignore" });
      } catch {
        // ignore if already terminated
      }
    } else {
      try {
        backendProcess.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
    backendProcess = null;
  }

  try {
    if (fs.existsSync(backendUrlFile)) {
      fs.unlinkSync(backendUrlFile);
    }
  } catch {}
}
