import { Module } from '@nestjs/common';
import { GoogleSheetsController } from './google-sheets.controller';
import { GoogleSheetsService } from './google-sheets.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GoogleSheetsController],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
