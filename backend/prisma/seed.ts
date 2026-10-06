import { PrismaClient, SiteStatus, TestResultStatus, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding for Testing/Development...');

  console.log('ℹ️ Database seed script executed. Dummy data seeding is disabled for real data usage.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
