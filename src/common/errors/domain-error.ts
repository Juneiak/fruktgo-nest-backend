// src/shared-kernel/errors/domain-error.ts
export const DOMAIN_ERROR_CODES = [
  'NOT_FOUND',
  'CONFLICT',
  'FORBIDDEN',
  'UNAUTHORIZED',
  'VALIDATION',
  'INVARIANT',       // нарушение инварианта домена
  'CONCURRENCY',     // гонка версий/optimistic lock
  'DEPENDENCY_FAILED',
  'RATE_LIMITED',
  'UNAVAILABLE',
  'BAD_REQUEST',
] as const;
export type DomainErrorCode = typeof DOMAIN_ERROR_CODES[number];

export type DomainErrorMeta = {
  entity?: string;
  id?: string;
  correlationId?: string;
  [k: string]: unknown;
};

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: unknown;
  readonly meta?: DomainErrorMeta;
  readonly cause?: unknown;

  constructor(args: {
    code: DomainErrorCode;
    message?: string;
    details?: unknown;
    meta?: DomainErrorMeta;
    cause?: unknown;
  }) {
    super(args.message ?? args.code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'DomainError';
    this.code = args.code;
    this.details = args.details;
    this.meta = args.meta;
    this.cause = args.cause;
    if (Error.captureStackTrace) Error.captureStackTrace(this, DomainError);
  }

  // Фабрики — удобно бросать одной строчкой
  static notFound(entity: string, id: string, details?: unknown) {
    return new DomainError({
      code: 'NOT_FOUND',
      message: `${entity} not found`,
      meta: { entity, id },
      details,
    });
  }
  static conflict(message = 'Conflict', meta?: DomainErrorMeta, details?: unknown) {
    return new DomainError({ code: 'CONFLICT', message, meta, details });
  }
  static forbidden(message = 'Forbidden', meta?: DomainErrorMeta) {
    return new DomainError({ code: 'FORBIDDEN', message, meta });
  }
  static unauthorized(message = 'Unauthorized', meta?: DomainErrorMeta) {
    return new DomainError({ code: 'UNAUTHORIZED', message, meta });
  }
  static validation(message = 'Validation failed', details?: unknown, meta?: DomainErrorMeta) {
    return new DomainError({ code: 'VALIDATION', message, details, meta });
  }
  static invariant(message = 'Invariant violated', details?: unknown, meta?: DomainErrorMeta) {
    return new DomainError({ code: 'INVARIANT', message, details, meta });
  }
  static concurrency(message = 'Version conflict', meta?: DomainErrorMeta) {
    return new DomainError({ code: 'CONCURRENCY', message, meta });
  }
  static badRequest(message = 'Bad request', meta?: DomainErrorMeta) {
    return new DomainError({ code: 'BAD_REQUEST', message, meta });
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;