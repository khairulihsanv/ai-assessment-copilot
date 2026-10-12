import { serve } from "@hono/node-server";
import app from "./app.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

console.log(`Starting backend server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});
