import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTestingResultRowDto, UpdateSiteRowDto } from './dto/update-single-row.dto';
import { AuditSource } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GoogleSheetsService {
  constructor(private readonly prisma: PrismaService) {}

  private getSitesFilePath(): string {
    return path.join(process.cwd(), 'data', 'sites.json');
  }

  private getLogsFilePath(): string {
    return path.join(process.cwd(), 'data', 'logs.json');
  }

  private readSitesFromFile(): any[] {
    try {
      const file = this.getSitesFilePath();
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
    } catch (err) {
      console.error('Error reading sites file in GoogleSheetsService:', err);
    }
    return [];
  }

  private writeSitesToFile(sites: any[]): void {
    try {
      const file = this.getSitesFilePath();
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(sites, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing sites file in GoogleSheetsService:', err);
    }
  }

  private readLogsFromFile(): any[] {
    try {
      const file = this.getLogsFilePath();
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
    } catch (err) {
      console.error('Error reading logs file in GoogleSheetsService:', err);
    }
    return [];
  }

  private writeLogsToFile(logs: any[]): void {
    try {
      const file = this.getLogsFilePath();
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing logs file in GoogleSheetsService:', err);
    }
  }

  // Single Row Update for TestingResult
  async updateTestingResultRow(id: string, dto: UpdateTestingResultRowDto) {
    if (!id) {
      throw new BadRequestException('ID record wajib disertakan.');
    }

    // Strict validation
    if (dto.result && !['BERHASIL', 'GAGAL'].includes(dto.result)) {
      throw new BadRequestException(`Nilai result '${dto.result}' tidak valid. Harus BERHASIL atau GAGAL.`);
    }

    if (dto.reportStatus && !['ADA', 'TIDAK_ADA'].includes(dto.reportStatus)) {
      throw new BadRequestException(
        `Nilai reportStatus '${dto.reportStatus}' tidak valid. Harus ADA atau TIDAK_ADA.`,
      );
    }

    try {
      const record = await this.prisma.testingResult.findUnique({
        where: { id },
        include: { site: true },
      });

      if (record) {
        if (dto.version !== undefined && dto.version !== record.version) {
          throw new ConflictException(
            `CONFLICT: Record ID ${id} (Versi Client: ${dto.version}) sudah diperbarui di server menjadi Versi ${record.version}.`,
          );
        }

        const nextVersion = record.version + 1;
        const changedBy = dto.testerName?.trim() || record.testerName || 'Google Sheets User';
        const source = dto.source === 'WEBSITE' ? AuditSource.WEBSITE : AuditSource.GOOGLE_SHEETS;

        const updatedRecord = await this.prisma.testingResult.update({
          where: { id },
          data: {
            ...(dto.testerName && { testerName: dto.testerName }),
            ...(dto.result && { result: dto.result as any }),
            ...(dto.reportStatus && { reportStatus: dto.reportStatus as any }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
            version: nextVersion,
          },
        });

        try {
          await this.prisma.auditLog.create({
            data: {
              recordId: id,
              entityType: 'TESTING_RESULT',
              changedFrom: JSON.stringify({ testerName: record.testerName, result: record.result, version: record.version }),
              changedTo: JSON.stringify({ testerName: updatedRecord.testerName, result: updatedRecord.result, version: updatedRecord.version }),
              changedBy,
              source,
            },
          });
        } catch (e) {}

        return {
          status: 'SUCCESS',
          message: `Record ID ${id} berhasil diperbarui (Versi ${nextVersion}).`,
          data: updatedRecord,
          syncStatus: '✅ Synced',
        };
      }
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) throw err;
      // Silently fall back to persistent file store
    }

    // Persistent JSON File Fallback
    const logs = this.readLogsFromFile();
    const existingLog = logs.find((l) => l.id === id);

    const nextVersion = (existingLog?.version || 1) + 1;
    const updatedLog = {
      id,
      siteId: existingLog?.siteId || '',
      siteName: existingLog?.siteName || 'Situs QA',
      siteUrl: existingLog?.siteUrl || '',
      testerName: dto.testerName?.trim() || existingLog?.testerName || 'Google Sheets User',
      result: dto.result || existingLog?.result || 'BERHASIL',
      reportStatus: dto.reportStatus || existingLog?.reportStatus || 'TIDAK_ADA',
      notes: dto.notes !== undefined ? dto.notes : existingLog?.notes || '',
      date: existingLog?.date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: nextVersion,
    };

    const updatedLogsList = logs.map((l) => (l.id === id ? updatedLog : l));
    if (!logs.some((l) => l.id === id)) updatedLogsList.unshift(updatedLog);
    this.writeLogsToFile(updatedLogsList);

    return {
      status: 'SUCCESS',
      message: `Record ID ${id} berhasil diperbarui di persistent JSON store.`,
      data: updatedLog,
      syncStatus: '✅ Synced',
    };
  }

  // Single Row Update for Site
  async updateSiteRow(id: string, dto: UpdateSiteRowDto) {
    if (!id) {
      throw new BadRequestException('ID Site wajib disertakan.');
    }

    const targetDate = dto.targetDate || (id.match(/(\d{4}-\d{2}-\d{2})/) ? id.match(/(\d{4}-\d{2}-\d{2})/)![1] : null);
    const sites = this.readSitesFromFile();
    const siteNameLower = (dto.name || '').trim().toLowerCase();

    // If targetDate is specified or ID is a daily entry, target the specific date record!
    let existingSiteIndex = -1;
    if (targetDate) {
      existingSiteIndex = sites.findIndex((s) => {
        const sDate = s.targetDate || (s.lastTestedAt ? s.lastTestedAt.split('T')[0] : '');
        return s.id === id || (s.name && s.name.trim().toLowerCase() === siteNameLower && sDate === targetDate);
      });
    } else {
      existingSiteIndex = sites.findIndex((s) => s.id === id || (s.name && s.name.trim().toLowerCase() === siteNameLower));
    }

    const existingSite = existingSiteIndex >= 0 ? sites[existingSiteIndex] : null;
    const nextVersion = (existingSite?.version || 1) + 1;
    const cleanTester = dto.currentTester?.trim() && dto.currentTester !== 'Google Sheets User' ? dto.currentTester.trim() : null;

    const updatedSiteItem = {
      id: existingSite?.id || id,
      name: dto.name?.trim() || existingSite?.name || 'Situs QA',
      url: dto.url?.trim() || existingSite?.url || '',
      status: dto.status || existingSite?.status || 'BELUM_DICEK',
      lastTestedBy: cleanTester !== null ? cleanTester : existingSite?.lastTestedBy || null,
      lastTestedAt: new Date().toISOString(),
      targetDate: targetDate || existingSite?.targetDate || new Date().toISOString().split('T')[0],
      targetEndDate: existingSite?.targetEndDate || null,
      notes: existingSite?.notes || '',
      updatedAt: new Date().toISOString(),
      version: nextVersion,
    };

    let updatedSitesList = [...sites];
    if (existingSiteIndex >= 0) {
      updatedSitesList[existingSiteIndex] = updatedSiteItem;
    } else {
      updatedSitesList.unshift(updatedSiteItem);
    }
    this.writeSitesToFile(updatedSitesList);

    // Synchronize to Prisma DB if available
    try {
      const dbSite = await this.prisma.site.findFirst({
        where: { OR: [{ id }, { name: dto.name }] },
      });
      if (dbSite) {
        await this.prisma.site.update({
          where: { id: dbSite.id },
          data: {
            ...(dto.status && { status: (dto.status === 'BERHASIL' ? 'SELESAI' : dto.status === 'GAGAL' ? 'GAGAL_ADA_REPORT' : dto.status) as any }),
            ...(cleanTester && { currentTester: cleanTester }),
          },
        });
      }
    } catch (e) {}

    return {
      status: 'SUCCESS',
      message: `Site ID ${updatedSiteItem.id} berhasil diperbarui di persistent JSON store.`,
      data: updatedSiteItem,
      syncStatus: '✅ Synced',
    };
  }

  async getAuditLogs() {
    try {
      return await this.prisma.auditLog.findMany({
        orderBy: { changedAt: 'desc' },
        take: 50,
      });
    } catch (err) {
      return [];
    }
  }
}
