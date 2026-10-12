import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

async function main() {
  const db = await PGlite.create({ extensions: { vector } });
  console.log("PGlite created");
}
main();
