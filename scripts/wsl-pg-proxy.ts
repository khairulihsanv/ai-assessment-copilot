import net from "node:net";
import { execSync } from "node:child_process";

function getWslIp(): string {
  try {
    const out = execSync("wsl -d Ubuntu -u root -- hostname -I", { encoding: "utf-8" }).trim();
    const ip = out.split(/\s+/)[0];
    if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      return ip;
    }
  } catch (e) {
    console.error("Failed to query WSL IP:", e);
  }
  return "172.30.150.98";
}

const targetHost = getWslIp();
const targetPort = 5432;
const listenPort = Number(process.env.TEST_DB_PORT ?? 54321);
const listenHost = "127.0.0.1";

const server = net.createServer((clientSocket) => {
  const cPort = clientSocket.remotePort;
  const targetSocket = net.connect(targetPort, targetHost);

  clientSocket.pipe(targetSocket);
  targetSocket.pipe(clientSocket);

  clientSocket.on("error", (err) => {
    // console.log(`[proxy] Client ${cPort} error:`, err.message);
    targetSocket.destroy();
  });
  targetSocket.on("error", (err) => {
    console.error(`[proxy] Target connection error for ${cPort}:`, err.message);
    clientSocket.destroy();
  });
});

server.listen(listenPort, listenHost, () => {
  console.log(`[wsl-pg-proxy] Forwarding 127.0.0.1:${listenPort} -> ${targetHost}:${targetPort}`);
});

process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
