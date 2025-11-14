import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError, DomainErrorCode } from './domain-error';

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
      case DomainErrorCode.NOT_FOUND:
        return 404;
      case DomainErrorCode.FORBIDDEN:
        return 403;
      case DomainErrorCode.UNAUTHORIZED:
        return 401;
      case DomainErrorCode.VALIDATION:
      case DomainErrorCode.INVARIANT:
      case DomainErrorCode.BAD_REQUEST:
        return 400;
      case DomainErrorCode.CONFLICT:
      case DomainErrorCode.CONCURRENCY:
        return 409;
      case DomainErrorCode.RATE_LIMITED:
        return 429;
      case DomainErrorCode.DEPENDENCY_FAILED:
        return 424;
      case DomainErrorCode.UNAVAILABLE:
        return 503;
      default:
        // TypeScript проверит exhaustiveness всех значений enum
        // const exhaustiveCheck: never = code;
        return 500;
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