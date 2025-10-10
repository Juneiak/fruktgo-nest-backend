import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from './domain-error';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(err: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = this.mapStatus(err.code);
    const body = {
      code: err.code,
      message: err.message,
      meta: err.meta,
      details: this.sanitize(err.details),
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    };

    res.status(status).json(body);
  }

  private mapStatus(code: DomainError['code']): number {
    switch (code) {
      case 'NOT_FOUND':        return 404;
      case 'FORBIDDEN':        return 403;
      case 'UNAUTHORIZED':     return 401;
      case 'VALIDATION':       return 400;
      case 'INVARIANT':        return 400;
      case 'CONFLICT':         return 409;
      case 'CONCURRENCY':      return 409;
      case 'RATE_LIMITED':     return 429;
      case 'DEPENDENCY_FAILED':return 424;
      case 'UNAVAILABLE':      return 503;
      default:                 return 500;
    }
  }

  private sanitize(details: unknown) {
    // не вытекали внутренние stack/секреты
    if (details instanceof Error) {
      return { name: details.name, message: details.message };
    }
    return details;
  }
}