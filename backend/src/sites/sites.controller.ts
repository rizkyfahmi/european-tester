import { Controller, Get, Post, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { SitesService } from './sites.service';
import { Response } from 'express';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get('dashboard')
  async getDashboardOverview() {
    const data = await this.sitesService.getDashboardOverview();
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Get()
  async getAllSites() {
    const data = await this.sitesService.getAllSites();
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Post()
  async createSite(@Body() siteData: { name: string; url: string; targetDate?: string; targetEndDate?: string }) {
    const data = await this.sitesService.createSite(siteData);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Post('sync')
  async syncSites(@Body() body: { sites: any[] }) {
    const data = await this.sitesService.syncSites(body.sites || []);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Post('bulk-delete')
  async bulkDeleteSites(@Body() body: { siteIds: string[]; targetDate?: string }) {
    const data = await this.sitesService.bulkDeleteSites(body.siteIds || [], body.targetDate);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Delete(':id')
  async deleteSite(@Param('id') id: string, @Query('targetDate') targetDate?: string) {
    const data = await this.sitesService.deleteSite(id, targetDate);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Delete(':part1/:part2')
  async deleteSiteTwoParts(
    @Param('part1') part1: string,
    @Param('part2') part2: string,
    @Query('targetDate') targetDate?: string,
  ) {
    const id = `${part1}/${part2}`;
    const data = await this.sitesService.deleteSite(id, targetDate);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Delete('by-name/:name')
  async deleteSiteByName(@Param('name') name: string) {
    const data = await this.sitesService.deleteSiteByName(name);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Post('test')
  async updateTestResultDirect(
    @Body() resultData: { siteId?: string; id?: string; testerName: string; result: 'BERHASIL' | 'GAGAL'; notes?: string; reportStatus?: 'ADA' | 'TIDAK_ADA' },
  ) {
    const id = resultData.siteId || resultData.id || '';
    const data = await this.sitesService.updateTestResult(id, resultData);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Post(':id/test')
  async updateTestResult(
    @Param('id') id: string,
    @Body() resultData: { testerName: string; result: 'BERHASIL' | 'GAGAL'; notes?: string; reportStatus?: 'ADA' | 'TIDAK_ADA' },
  ) {
    const data = await this.sitesService.updateTestResult(id, resultData);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Post(':part1/:part2/test')
  async updateTestResultTwoParts(
    @Param('part1') part1: string,
    @Param('part2') part2: string,
    @Body() resultData: { testerName: string; result: 'BERHASIL' | 'GAGAL'; notes?: string; reportStatus?: 'ADA' | 'TIDAK_ADA' },
  ) {
    const id = `${part1}/${part2}`;
    const data = await this.sitesService.updateTestResult(id, resultData);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Post(':part1/:part2/:part3/test')
  async updateTestResultThreeParts(
    @Param('part1') part1: string,
    @Param('part2') part2: string,
    @Param('part3') part3: string,
    @Body() resultData: { testerName: string; result: 'BERHASIL' | 'GAGAL'; notes?: string; reportStatus?: 'ADA' | 'TIDAK_ADA' },
  ) {
    const id = `${part1}/${part2}/${part3}`;
    const data = await this.sitesService.updateTestResult(id, resultData);
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Get('logs')
  async getLogs() {
    const data = await this.sitesService.getLogs();
    return {
      status: 'SUCCESS',
      data,
    };
  }

  @Get('export/csv')
  async exportCsv(@Res() res: Response) {
    const csvContent = await this.sitesService.generateCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Rekap_QA_Sites.csv"');
    res.status(200).send(csvContent);
  }
}
