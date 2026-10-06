import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 Clearing all test data from database...');

  await prisma.testingResult.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.auditLog.deleteMany({});

  console.log('✅ All Sites, Testing Results, and Audit Logs have been deleted successfully!');
}

clearDatabase()
  .catch((err) => {
    console.error('❌ Failed to clear database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
