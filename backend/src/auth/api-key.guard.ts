import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'] || request.headers['authorization'];

    const rawKey = process.env.GOOGLE_SHEETS_API_KEY || 'qa-secret-api-key-2026';
    const validApiKey = rawKey.trim().replace(/^["']|["']$/g, '').trim();

    if (!apiKeyHeader) {
      throw new UnauthorizedException('API Key header (X-API-KEY) missing.');
    }

    const cleanedKey = apiKeyHeader
      .replace(/^Bearer\s+/i, '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .trim();

    if (cleanedKey !== validApiKey && cleanedKey !== rawKey.trim()) {
      throw new UnauthorizedException('Invalid API Key provided.');
    }

    return true;
  }
}
