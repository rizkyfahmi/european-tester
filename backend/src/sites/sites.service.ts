import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SiteStatus, TestResultStatus, ReportStatus, AuditSource } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export interface SiteItem {
  id: string;
  name: string;
  url: string;
  status: string;
  lastTestedBy?: string | null;
  lastTestedAt?: string | null;
  targetDate?: string | null;
  targetEndDate?: string | null;
  notes?: string | null;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestingLog {
  id: string;
  siteId: string;
  siteName: string;
  siteUrl: string;
  testerName: string;
  result: string;
  notes: string;
  date: string;
  version?: number;
}

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  private getSitesFilePath(): string {
    return path.join(process.cwd(), 'data', 'sites.json');
  }

  private getLogsFilePath(): string {
    return path.join(process.cwd(), 'data', 'logs.json');
  }

  private readSitesFromFile(): SiteItem[] {
    try {
      const file = this.getSitesFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading persistent sites JSON:', err);
    }
    return [];
  }

  private writeSitesToFile(sites: SiteItem[]): void {
    try {
      const file = this.getSitesFilePath();
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file, JSON.stringify(sites, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing persistent sites JSON:', err);
    }
  }

  private readLogsFromFile(): TestingLog[] {
    try {
      const file = this.getLogsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading persistent logs JSON:', err);
    }
    return [];
  }

  private writeLogsToFile(logs: TestingLog[]): void {
    try {
      const file = this.getLogsFilePath();
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(file, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing persistent logs JSON:', err);
    }
  }

  // 1. GET ALL SITES FROM DATABASE WITH FILE FALLBACK
  async getAllSites(): Promise<SiteItem[]> {
    try {
      let sites = await this.prisma.site.findMany({
        include: {
          testingResults: {
            orderBy: { testedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Auto-seed default initial sites if DB is empty
      if (sites.length === 0 && this.prisma.isConnected) {
        try {
          await this.prisma.site.createMany({
            data: [
              { name: 'European QA Portal', url: 'https://european-testing.com', status: 'BELUM_DICEK' },
              { name: 'Testing Portal Demo', url: 'https://qa-test-demo.com', status: 'BELUM_DICEK' },
            ],
          });
          sites = await this.prisma.site.findMany({
            include: {
              testingResults: {
                orderBy: { testedAt: 'desc' },
                take: 1,
              },
            },
            orderBy: { createdAt: 'desc' },
          });
        } catch {
          // ignore seeding error
        }
      }

      const fileSites = this.readSitesFromFile();
      const fileMap = new Map(fileSites.map((s) => [s.id, s]));
      const todayStr = new Date().toISOString().split('T')[0];

      const formattedSites = sites.map((site) => {
        const latestTest = site.testingResults[0];
        const cached = fileMap.get(site.id);
        const targetDate = cached?.targetDate || (site.createdAt ? site.createdAt.toISOString().split('T')[0] : todayStr);
        const targetEndDate = cached?.targetEndDate || null;

        return {
          id: site.id,
          name: site.name,
          url: site.url,
          status: site.status === 'SELESAI' ? 'BERHASIL' : site.status === 'GAGAL_ADA_REPORT' ? 'GAGAL' : site.status,
          lastTestedBy: latestTest?.testerName || site.currentTester || null,
          lastTestedAt: latestTest ? latestTest.testedAt.toISOString() : site.completedAt ? site.completedAt.toISOString() : null,
          targetDate,
          targetEndDate,
          notes: latestTest?.notes || null,
          version: site.version,
          createdAt: site.createdAt.toISOString(),
          updatedAt: site.updatedAt.toISOString(),
        };
      });

      // Synchronize file database
      this.writeSitesToFile(formattedSites);
      return formattedSites;
    } catch {
      return this.readSitesFromFile();
    }
  }

  // 2. GET SITE DETAIL BY ID
  async getSiteById(id: string) {
    try {
      const site = await this.prisma.site.findUnique({
        where: { id },
        include: {
          testingResults: {
            orderBy: { testedAt: 'desc' },
          },
        },
      });

      if (site) return site;
    } catch {
      // Use local JSON fallback
    }

    const sites = this.readSitesFromFile();
    const found = sites.find((s) => s.id === id);
    if (!found) {
      throw new NotFoundException(`Site with ID ${id} not found.`);
    }
    return found;
  }

  // 3. POST / CREATE SITE TO DATABASE & PERSISTENT FILE STORE
  async createSite(siteData: { name: string; url: string; targetDate?: string; targetEndDate?: string }) {
    const rawUrl = (siteData.url || '').trim();
    const formattedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : `https://${rawUrl}`;
    const name = (siteData.name || '').trim();
    const normalizeUrl = (u: string) => u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const normNewUrl = normalizeUrl(formattedUrl);
    const normNewName = name.toLowerCase();

    // Check duplicate in file/database
    const existingSites = this.readSitesFromFile();
    const isDup = existingSites.some((s) => {
      const normExistingUrl = normalizeUrl(s.url || '');
      const normExistingName = (s.name || '').toLowerCase();
      return normExistingUrl === normNewUrl || normExistingName === normNewName;
    });

    if (isDup) {
      throw new BadRequestException(`Situs dengan nama "${name}" atau URL "${formattedUrl}" sudah terdaftar.`);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = siteData.targetDate || todayStr;
    const targetEndDate = siteData.targetEndDate && siteData.targetEndDate.trim() ? siteData.targetEndDate.trim() : null;

    const fallbackSite: SiteItem = {
      id: `site_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      url: formattedUrl,
      status: 'BELUM_DICEK',
      lastTestedBy: null,
      lastTestedAt: null,
      targetDate,
      targetEndDate,
      notes: null,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const newSite = await this.prisma.site.create({
        data: {
          name,
          url: formattedUrl,
          status: SiteStatus.BELUM_DICEK,
          version: 1,
        },
      });

      // Record Audit Log
      try {
        await this.prisma.auditLog.create({
          data: {
            recordId: newSite.id,
            entityType: 'SITE',
            changedFrom: 'NEW_RECORD',
            changedTo: JSON.stringify(newSite),
            changedBy: 'System / User',
            source: AuditSource.WEBSITE,
          },
        });
      } catch (auditErr) {
        console.warn('Could not write audit log:', auditErr);
      }

      const createdItem: SiteItem = {
        id: newSite.id,
        name: newSite.name,
        url: newSite.url,
        status: 'BELUM_DICEK',
        lastTestedBy: null,
        lastTestedAt: null,
        targetDate,
        targetEndDate,
        notes: null,
        version: newSite.version,
        createdAt: newSite.createdAt.toISOString(),
        updatedAt: newSite.updatedAt.toISOString(),
      };

      // Also persist to JSON file store
      const fileSites = this.readSitesFromFile();
      this.writeSitesToFile([createdItem, ...fileSites.filter((s) => s.id !== createdItem.id)]);

      return createdItem;
    } catch {
      const fileSites = this.readSitesFromFile();
      const updated = [fallbackSite, ...fileSites];
      this.writeSitesToFile(updated);

      return fallbackSite;
    }
  }

  // 4. POST TESTING RESULT TO DATABASE
  async updateTestResult(
    siteId: string,
    resultData: { testerName: string; result: 'BERHASIL' | 'GAGAL'; notes?: string; reportStatus?: 'ADA' | 'TIDAK_ADA' },
  ) {
    const finalTesterName = resultData.testerName.trim() || 'Tester';
    const finalNotes = resultData.notes?.trim() || '-';
    const nowIso = new Date().toISOString();

    try {
      const site = await this.prisma.site.findUnique({ where: { id: siteId } });
      if (site) {
        const testResultEnum = resultData.result === 'BERHASIL' ? TestResultStatus.BERHASIL : TestResultStatus.GAGAL;
        const reportStatusEnum = resultData.reportStatus
          ? resultData.reportStatus === 'ADA'
            ? ReportStatus.ADA
            : ReportStatus.TIDAK_ADA
          : resultData.result === 'GAGAL'
            ? ReportStatus.ADA
            : ReportStatus.TIDAK_ADA;

        const existingResult = await this.prisma.testingResult.findFirst({
          where: { siteId: site.id },
          orderBy: { createdAt: 'desc' },
        });

        let newTestingResult: any;
        if (existingResult) {
          newTestingResult = await this.prisma.testingResult.update({
            where: { id: existingResult.id },
            data: {
              testerName: finalTesterName,
              result: testResultEnum,
              reportStatus: reportStatusEnum,
              notes: finalNotes,
              testedAt: new Date(),
              version: existingResult.version + 1,
            },
          });
        } else {
          newTestingResult = await this.prisma.testingResult.create({
            data: {
              siteId: site.id,
              testerName: finalTesterName,
              result: testResultEnum,
              reportStatus: reportStatusEnum,
              notes: finalNotes,
              version: 1,
            },
          });
        }

        const newSiteStatus = resultData.result === 'BERHASIL' ? SiteStatus.SELESAI : SiteStatus.GAGAL_ADA_REPORT;
        const nextSiteVersion = site.version + 1;

        const updatedSite = await this.prisma.site.update({
          where: { id: siteId },
          data: {
            status: newSiteStatus,
            currentTester: finalTesterName,
            completedAt: new Date(),
            version: nextSiteVersion,
          },
        });

        try {
          await this.prisma.auditLog.create({
            data: {
              recordId: newTestingResult.id,
              entityType: 'TESTING_RESULT',
              changedFrom: JSON.stringify({ previousStatus: site.status, version: site.version }),
              changedTo: JSON.stringify({ result: newTestingResult.result, reportStatus: newTestingResult.reportStatus, notes: newTestingResult.notes }),
              changedBy: newTestingResult.testerName,
              source: AuditSource.WEBSITE,
            },
          });
        } catch (auditErr) {
          console.warn('Could not write audit log:', auditErr);
        }

        const siteOutput: SiteItem = {
          id: updatedSite.id,
          name: updatedSite.name,
          url: updatedSite.url,
          status: resultData.result,
          lastTestedBy: updatedSite.currentTester,
          lastTestedAt: newTestingResult.testedAt.toISOString(),
          notes: newTestingResult.notes,
          version: updatedSite.version,
        };

        const logOutput: TestingLog = {
          id: newTestingResult.id,
          siteId: updatedSite.id,
          siteName: updatedSite.name,
          siteUrl: updatedSite.url,
          testerName: newTestingResult.testerName,
          result: resultData.result,
          notes: newTestingResult.notes || '',
          date: newTestingResult.testedAt.toISOString(),
        };

        // Sync with local file store
        const fileSites = this.readSitesFromFile();
        const updatedFileSites = fileSites.map((s) => (s.id === siteId ? siteOutput : s));
        this.writeSitesToFile(updatedFileSites);

        const fileLogs = this.readLogsFromFile();
        const existingLogIndex = fileLogs.findIndex(
          (l) => l.siteId === siteId || (l.siteName && l.siteName.toLowerCase() === siteOutput.name.toLowerCase()),
        );
        let updatedLogsList: TestingLog[];
        if (existingLogIndex >= 0) {
          updatedLogsList = [...fileLogs];
          updatedLogsList[existingLogIndex] = logOutput;
        } else {
          updatedLogsList = [logOutput, ...fileLogs];
        }
        this.writeLogsToFile(updatedLogsList);

        return { site: siteOutput, log: logOutput };
      }
    } catch {
      // Use persistent file store fallback
    }

    // Persistent File Fallback Execution
    const fileSites = this.readSitesFromFile();
    const siteToUpdate = fileSites.find(
      (s) => s.id === siteId || (s.name && s.name.toLowerCase() === (resultData as any).siteName?.toLowerCase()),
    );
    const existingName = (resultData as any).siteName || siteToUpdate?.name || 'Situs';
    const existingUrl = (resultData as any).siteUrl || siteToUpdate?.url || `https://${existingName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

    const updatedSiteItem: SiteItem = {
      id: siteToUpdate?.id || siteId,
      name: existingName,
      url: existingUrl,
      status: resultData.result,
      lastTestedBy: finalTesterName,
      lastTestedAt: nowIso,
      notes: finalNotes,
      version: (siteToUpdate?.version || 1) + 1,
    };

    const newLogItem: TestingLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      siteId: updatedSiteItem.id,
      siteName: updatedSiteItem.name,
      siteUrl: updatedSiteItem.url,
      testerName: finalTesterName,
      result: resultData.result,
      notes: finalNotes,
      date: nowIso,
    };

    const updatedSitesList = fileSites.map((s) => (s.id === updatedSiteItem.id ? updatedSiteItem : s));
    if (!fileSites.some((s) => s.id === updatedSiteItem.id)) {
      updatedSitesList.unshift(updatedSiteItem);
    }
    this.writeSitesToFile(updatedSitesList);

    const fileLogs = this.readLogsFromFile();
    const existingLogIndex = fileLogs.findIndex(
      (l) => l.siteId === updatedSiteItem.id || (l.siteName && l.siteName.toLowerCase() === updatedSiteItem.name.toLowerCase()),
    );
    let updatedLogsList: TestingLog[];
    if (existingLogIndex >= 0) {
      updatedLogsList = [...fileLogs];
      updatedLogsList[existingLogIndex] = newLogItem;
    } else {
      updatedLogsList = [newLogItem, ...fileLogs];
    }
    this.writeLogsToFile(updatedLogsList);

    return { site: updatedSiteItem, log: newLogItem };
  }

  // 5. GET LOGS FROM DATABASE WITH FILE FALLBACK
  async getLogs(): Promise<TestingLog[]> {
    try {
      const results = await this.prisma.testingResult.findMany({
        include: { site: true },
        orderBy: { testedAt: 'desc' },
      });

      const formattedLogs = results.map((log) => ({
        id: log.id,
        siteId: log.siteId,
        siteName: log.site?.name || 'Situs QA',
        siteUrl: log.site?.url || '',
        testerName: log.testerName,
        result: log.result === 'BERHASIL' ? 'BERHASIL' : 'GAGAL',
        reportStatus: log.reportStatus,
        notes: log.notes || '',
        date: log.testedAt.toISOString(),
        version: log.version,
      }));

      this.writeLogsToFile(formattedLogs);
      return formattedLogs;
    } catch {
      return this.readLogsFromFile();
    }
  }

  // 6. GET DASHBOARD OVERVIEW
  async getDashboardOverview() {
    const allSites = await this.getAllSites();
    const logs = await this.getLogs();

    const totalSites = allSites.length;
    const belumDicekCount = allSites.filter((s) => s.status === 'BELUM_DICEK').length;
    const berhasilCount = allSites.filter((s) => s.status === 'BERHASIL').length;
    const gagalCount = allSites.filter((s) => s.status === 'GAGAL').length;

    return {
      stats: {
        totalSites,
        belumDicekCount,
        berhasilCount,
        gagalCount,
      },
      sites: allSites,
      logs,
      spreadsheetSync: {
        connected: true,
        sourceOfTruth: 'Database Backend & File Backup',
        lastSyncedAt: new Date().toISOString(),
        totalSyncedRows: totalSites,
      },
    };
  }

  // 7. GENERATE CSV
  async generateCSV(): Promise<string> {
    const sites = await this.getAllSites();
    const headers = ['ID', 'Nama Situs', 'Link Target', 'Status Pengujian', 'Nama Tester', 'Waktu Testing', 'Catatan Temuan', 'Version'];
    const rows = sites.map((site) => [
      `"${site.id}"`,
      `"${(site.name || '').replace(/"/g, '""')}"`,
      `"${(site.url || '').replace(/"/g, '""')}"`,
      `"${site.status === 'BERHASIL' ? 'Berhasil' : site.status === 'GAGAL' ? 'Gagal' : 'Belum Dicek'}"`,
      `"${(site.lastTestedBy || '-').replace(/"/g, '""')}"`,
      `"${(site.lastTestedAt || '-').replace(/"/g, '""')}"`,
      `"${(site.notes || '-').replace(/"/g, '""')}"`,
      `"${site.version || 1}"`,
    ]);

    return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // 8. DELETE SITE FROM SPECIFIC DATE ONWARDS (DELETES DATE >= deleteDate, KEEPS DATE < deleteDate)
  async deleteSite(id: string, targetDateQuery?: string) {
    let deletedSite: any = null;
    const cleanId = decodeURIComponent(id).trim();

    let nameSearch = '';
    let deleteDate = targetDateQuery ? targetDateQuery.trim() : '';
    if (cleanId.startsWith('daily_')) {
      const parts = cleanId.split('_');
      if (parts.length >= 2) {
        nameSearch = parts[1].replace(/_/g, ' ').trim();
      }
      const matchDate = cleanId.match(/(\d{4}-\d{2}-\d{2})/);
      if (matchDate && !deleteDate) {
        deleteDate = matchDate[1];
      }
    }

    const fileSites = this.readSitesFromFile();
    const targetNameLower = (nameSearch || '').trim().toLowerCase();

    const getPreviousDateStr = (dateStr: string): string => {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(Date.UTC(year, month, day - 1));
      return d.toISOString().split('T')[0];
    };

    const cutoffDate = deleteDate ? getPreviousDateStr(deleteDate) : null;

    // Remove entries where targetDate >= deleteDate, update cutoff date targetEndDate for remaining entries < deleteDate
    const updated = fileSites
      .filter((s) => {
        const sId = (s.id || '').trim();
        const sNameLower = (s.name || '').trim().toLowerCase();
        const sDate = s.targetDate || (s.lastTestedAt ? s.lastTestedAt.split('T')[0] : '');

        if (sId === cleanId) return false;
        if (targetNameLower && deleteDate && sNameLower === targetNameLower && sDate >= deleteDate) {
          return false;
        }
        return true;
      })
      .map((s) => {
        const sNameLower = (s.name || '').trim().toLowerCase();
        if (targetNameLower && sNameLower === targetNameLower && cutoffDate) {
          return {
            ...s,
            targetEndDate: cutoffDate,
          };
        }
        return s;
      });

    // Check if any other date instances remain for this site name
    const remainingForName = updated.filter((s) => s.name.trim().toLowerCase() === targetNameLower);
    if (remainingForName.length === 0) {
      try {
        const existing = await this.prisma.site.findFirst({
          where: {
            OR: [
              { id: cleanId },
              ...(nameSearch ? [{ name: nameSearch }] : []),
            ],
          },
        });
        if (existing) {
          deletedSite = existing;
          await this.prisma.site.deleteMany({
            where: { id: existing.id },
          });

          try {
            await this.prisma.auditLog.create({
              data: {
                recordId: existing.id,
                entityType: 'SITE',
                changedFrom: JSON.stringify(existing),
                changedTo: 'DELETED',
                changedBy: 'System / User',
                source: AuditSource.WEBSITE,
              },
            });
          } catch (auditErr) {
            console.warn('Could not write audit log for delete:', auditErr);
          }
        }
      } catch {
        // Silently proceed
      }
    }

    this.writeSitesToFile(updated);

    return {
      success: true,
      id: cleanId,
      deleteDate,
      cutoffDate,
      deletedSite,
    };
  }

  async deleteSiteByName(name: string) {
    const cleanName = decodeURIComponent(name).trim().toLowerCase();
    try {
      await this.prisma.site.deleteMany({
        where: { name: cleanName },
      });
    } catch {}

    const fileSites = this.readSitesFromFile();
    const updated = fileSites.filter((s) => {
      const sNameLower = (s.name || '').trim().toLowerCase();
      const sId = (s.id || '').trim().toLowerCase();
      if (sNameLower === cleanName) return false;
      if (sId.includes(cleanName)) return false;
      return true;
    });
    this.writeSitesToFile(updated);
    return { success: true, name: cleanName };
  }
}

