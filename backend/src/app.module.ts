import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SitesModule } from './sites/sites.module';
import { PrismaModule } from './prisma/prisma.module';
import { GoogleSheetsModule } from './google-sheets/google-sheets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SitesModule,
    GoogleSheetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
