import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type AttemptWindow = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, AttemptWindow>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const limit = this.getLimit();
    const ttlMs = this.getTtlMs();
    const key = this.buildKey(request);
    const now = Date.now();
    const currentAttempt = this.attempts.get(key);

    if (!currentAttempt || currentAttempt.resetAt <= now) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + ttlMs,
      });
      return true;
    }

    if (currentAttempt.count >= limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((currentAttempt.resetAt - now) / 1000),
      );
      response.setHeader('Retry-After', retryAfterSeconds.toString());
      throw new HttpException(
        'Too many authentication attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    currentAttempt.count += 1;
    this.attempts.set(key, currentAttempt);
    return true;
  }

  private buildKey(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : request.ip || request.socket.remoteAddress || 'unknown';

    return `${request.method}:${request.path}:${clientIp}`;
  }

  private getLimit() {
    const rawLimit = Number.parseInt(
      process.env.AUTH_RATE_LIMIT_MAX ?? '10',
      10,
    );

    return Number.isNaN(rawLimit) ? 10 : rawLimit;
  }

  private getTtlMs() {
    const rawTtl = Number.parseInt(
      process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? '60000',
      10,
    );

    return Number.isNaN(rawTtl) ? 60_000 : rawTtl;
  }
}
