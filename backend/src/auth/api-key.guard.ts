import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'] || request.headers['authorization'];

    const validApiKey = process.env.GOOGLE_SHEETS_API_KEY || 'qa-secret-api-key-2026';

    if (!apiKeyHeader) {
      throw new UnauthorizedException('API Key header (X-API-KEY) missing.');
    }

    const cleanedKey = apiKeyHeader.replace('Bearer ', '').trim();

    if (cleanedKey !== validApiKey) {
      throw new UnauthorizedException('Invalid API Key provided.');
    }

    return true;
  }
}
