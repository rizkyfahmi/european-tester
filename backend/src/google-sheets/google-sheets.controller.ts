import {
  Controller,
  Patch,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GoogleSheetsService } from './google-sheets.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { UpdateTestingResultRowDto, UpdateSiteRowDto } from './dto/update-single-row.dto';

@Controller('google-sheets')
export class GoogleSheetsController {
  constructor(private readonly googleSheetsService: GoogleSheetsService) {}

  // Single Row Update Endpoint for Testing Results (Called by Google Apps Script Save Row)
  @Patch('testing-results/:id')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateTestingResultRow(
    @Param('id') id: string,
    @Body() dto: UpdateTestingResultRowDto,
  ) {
    return this.googleSheetsService.updateTestingResultRow(id, dto);
  }

  // Single Row Update Endpoint for Sites (Called by Google Apps Script Save Row)
  @Patch('sites')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateSiteRowDirect(
    @Body() dto: UpdateSiteRowDto & { id?: string; siteId?: string },
  ) {
    const id = dto.id || dto.siteId || '';
    return this.googleSheetsService.updateSiteRow(id, dto);
  }

  @Patch('sites/:id')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateSiteRow(
    @Param('id') id: string,
    @Body() dto: UpdateSiteRowDto,
  ) {
    return this.googleSheetsService.updateSiteRow(id, dto);
  }

  @Patch('sites/:part1/:part2')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateSiteRowTwoParts(
    @Param('part1') part1: string,
    @Param('part2') part2: string,
    @Body() dto: UpdateSiteRowDto,
  ) {
    const id = `${part1}/${part2}`;
    return this.googleSheetsService.updateSiteRow(id, dto);
  }

  @Patch('sites/:part1/:part2/:part3')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateSiteRowThreeParts(
    @Param('part1') part1: string,
    @Param('part2') part2: string,
    @Param('part3') part3: string,
    @Body() dto: UpdateSiteRowDto,
  ) {
    const id = `${part1}/${part2}/${part3}`;
    return this.googleSheetsService.updateSiteRow(id, dto);
  }

  // Get Audit Logs Endpoint
  @Get('audit-logs')
  async getAuditLogs() {
    return this.googleSheetsService.getAuditLogs();
  }
}
