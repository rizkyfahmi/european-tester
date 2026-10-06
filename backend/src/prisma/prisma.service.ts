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
    } catch {
      this.isConnected = false;
      console.log('💡 MySQL Database (3306) tidak terdeteksi - Backend otomatis menggunakan File Database Storage Fallback (data/*.json)');
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
