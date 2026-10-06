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
  @Patch('sites/:id')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async updateSiteRow(
    @Param('id') id: string,
    @Body() dto: UpdateSiteRowDto,
  ) {
    return this.googleSheetsService.updateSiteRow(id, dto);
  }

  // Get Audit Logs Endpoint
  @Get('audit-logs')
  async getAuditLogs() {
    return this.googleSheetsService.getAuditLogs();
  }
}
