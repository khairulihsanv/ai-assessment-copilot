const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_HCFvQ49hqIoc@ep-raspy-base-b3xtlvc1-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true'
    }
  }
});

async function main() {
  console.time('DB Query');
  const user = await prisma.user.findFirst({ where: { email: 'dosen.demo@example.com' } });
  console.timeEnd('DB Query');

  if (user) {
    console.time('Bcrypt Compare');
    const match = await bcrypt.compare('Dosen@12345', user.passwordHash);
    console.timeEnd('Bcrypt Compare');
    console.log('Match:', match);
  }
}
main().finally(() => prisma.$disconnect());
