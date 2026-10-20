import * as fs from "node:fs";
import * as path from "node:path";

const urlFile = path.resolve(__dirname, ".integration-backend-url");
if (fs.existsSync(urlFile)) {
  const url = fs.readFileSync(urlFile, "utf-8").trim();
  if (url) {
    process.env.BACKEND_URL = url;
  }
}
