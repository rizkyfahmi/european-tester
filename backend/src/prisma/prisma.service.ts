import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      console.log('✅ Successfully connected to MySQL Database via Prisma');
      await this.ensureTablesExist();
    } catch (err) {
      this.isConnected = false;
      console.log('💡 MySQL Database fallback enabled:', err);
    }
  }

  private async ensureTablesExist() {
    try {
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS User (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          username VARCHAR(191) NOT NULL UNIQUE,
          email VARCHAR(191) NULL UNIQUE,
          password VARCHAR(191) NOT NULL,
          role VARCHAR(191) NOT NULL DEFAULT 'tester',
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Site (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          name VARCHAR(191) NOT NULL,
          url VARCHAR(191) NOT NULL,
          status ENUM('BELUM_DICEK', 'SEDANG_DICEK', 'SELESAI', 'GAGAL_ADA_REPORT') NOT NULL DEFAULT 'BELUM_DICEK',
          currentTester VARCHAR(191) NULL,
          startedAt DATETIME(3) NULL,
          completedAt DATETIME(3) NULL,
          version INT NOT NULL DEFAULT 1,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS TestingResult (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          siteId VARCHAR(191) NOT NULL,
          testerName VARCHAR(191) NOT NULL,
          result ENUM('BERHASIL', 'GAGAL') NOT NULL,
          reportStatus ENUM('ADA', 'TIDAK_ADA') NOT NULL DEFAULT 'TIDAK_ADA',
          notes TEXT NULL,
          version INT NOT NULL DEFAULT 1,
          testedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          FOREIGN KEY (siteId) REFERENCES Site(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS AuditLog (
          id VARCHAR(191) NOT NULL PRIMARY KEY,
          recordId VARCHAR(191) NOT NULL,
          entityType VARCHAR(191) NOT NULL,
          changedFrom TEXT NOT NULL,
          changedTo TEXT NOT NULL,
          changedBy VARCHAR(191) NOT NULL,
          source ENUM('WEBSITE', 'GOOGLE_SHEETS') NOT NULL DEFAULT 'WEBSITE',
          changedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ MySQL tables verified/created automatically');
    } catch (err) {
      console.error('Error auto-creating tables:', err);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.isConnected) {
        await this.$disconnect();
      }
    } catch {
      // ignore
    }
  }
}
