import { PrismaClient } from "@prisma/client";

const url = process.env.TEST_DATABASE_URL;
const p = new PrismaClient({ datasources: { db: { url } } });

async function run() {
  console.log("Connecting with single connection...");
  const user = await p.user.create({
    data: {
      name: "Test Dosen",
      email: `test-${Date.now()}@example.com`,
      passwordHash: "hash",
      role: "DOSEN"
    }
  });
  console.log("Created user successfully:", user.id);
  const found = await p.user.findUnique({ where: { id: user.id } });
  console.log("Found user:", found?.name);
  await p.user.delete({ where: { id: user.id } });
  console.log("Deleted user successfully");
}

run()
  .catch((e) => {
    console.error("ERR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
