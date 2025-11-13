// src/shared-kernel/errors/domain-error.ts
export enum DomainErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION = 'VALIDATION',
  INVARIANT = 'INVARIANT',           // нарушение инварианта домена
  CONCURRENCY = 'CONCURRENCY',       // гонка версий/optimistic lock
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNAVAILABLE = 'UNAVAILABLE',
  BAD_REQUEST = 'BAD_REQUEST',
}

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
      code: DomainErrorCode.NOT_FOUND,
      message: `${entity} not found`,
      meta: { entity, id },
      details,
    });
  }
  static conflict(message = 'Conflict', meta?: DomainErrorMeta, details?: unknown) {
    return new DomainError({ code: DomainErrorCode.CONFLICT, message, meta, details });
  }
  static forbidden(message = 'Forbidden', meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.FORBIDDEN, message, meta });
  }
  static unauthorized(message = 'Unauthorized', meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.UNAUTHORIZED, message, meta });
  }
  static validation(message = 'Validation failed', details?: unknown, meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.VALIDATION, message, details, meta });
  }
  static invariant(message = 'Invariant violated', details?: unknown, meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.INVARIANT, message, details, meta });
  }
  static concurrency(message = 'Version conflict', meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.CONCURRENCY, message, meta });
  }
  static badRequest(message = 'Bad request', meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.BAD_REQUEST, message, meta });
  }
  static unavailable(message = 'Service unavailable', meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.UNAVAILABLE, message, meta });
  }
  static rateLimited(message = 'Rate limit exceeded', meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.RATE_LIMITED, message, meta });
  }
  static dependencyFailed(message = 'Dependency failed', meta?: DomainErrorMeta) {
    return new DomainError({ code: DomainErrorCode.DEPENDENCY_FAILED, message, meta });
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;