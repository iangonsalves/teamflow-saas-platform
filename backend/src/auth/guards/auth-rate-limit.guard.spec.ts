import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

describe('AuthRateLimitGuard', () => {
  let guard: AuthRateLimitGuard;
  let originalLimit: string | undefined;
  let originalWindow: string | undefined;

  beforeEach(() => {
    originalLimit = process.env.AUTH_RATE_LIMIT_MAX;
    originalWindow = process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    guard = new AuthRateLimitGuard();
  });

  afterEach(() => {
    process.env.AUTH_RATE_LIMIT_MAX = originalLimit;
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = originalWindow;
  });

  it('blocks requests after the configured limit', () => {
    const request = {
      method: 'POST',
      path: '/auth/login',
      ip: '127.0.0.1',
      headers: {},
      socket: {
        remoteAddress: '127.0.0.1',
      },
    } as Request;
    const response = {
      setHeader: jest.fn(),
    } as unknown as Response;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(() => guard.canActivate(context)).toThrow(
      expect.objectContaining({
        status: HttpStatus.TOO_MANY_REQUESTS,
      }),
    );
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });
});
