// src/shared-kernel/errors/domain-error.ts
/**
 * Коды ошибок базы данных и других распространенных ошибок
 */
export enum DomainErrorCode {
  // DomainError коды
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION = 'VALIDATION',
  INVARIANT = 'INVARIANT',
  CONCURRENCY = 'CONCURRENCY',
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNAVAILABLE = 'UNAVAILABLE',
  BAD_REQUEST = 'BAD_REQUEST',
  
  // Database коды
  DB_DUPLICATE_KEY = 'DB_DUPLICATE_KEY',           // MongoDB duplicate key (11000)
  DB_CAST_ERROR = 'DB_CAST_ERROR',                 // Mongoose CastError
  DB_VALIDATION_ERROR = 'DB_VALIDATION_ERROR',     // Mongoose ValidationError
  DB_DOCUMENT_NOT_FOUND = 'DB_DOCUMENT_NOT_FOUND', // Mongoose DocumentNotFoundError
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',     // Connection failed
  
  // HTTP коды (для переопределения)
  HTTP_EXCEPTION = 'HTTP_EXCEPTION',               // Любое NestJS HTTP исключение
  
  // Fallback для всех остальных ошибок
  OTHER = 'OTHER',                                 // Все необработанные ошибки
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

/**
 * Тип для маппинга DomainErrorCode на HTTP исключения
 */
export type DomainErrorMapping = Partial<Record<DomainErrorCode, Error>>;

/**
 * Утилита для преобразования DomainError в HTTP исключения
 * 
 * @param error - Перехваченная ошибка
 * @param errorMapping - Объект с маппингом DomainErrorCode -> HTTP Exception
 * 
 * @example
 * ```typescript
 * try {
 *   await this.customerPort.getCustomer(query);
 * } catch (error) {
 *   handleDomainError(error, {
 *     [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
 *     [DomainErrorCode.CONFLICT]: new ConflictException('Конфликт данных'),
 *   });
 * }
 * ```
 */
export function handleDomainError(error: unknown, errorMapping: DomainErrorMapping): never {
  if (error instanceof DomainError) {
    const mappedError = errorMapping[error.code];
    if (mappedError) {
      throw mappedError;
    }
  }
  // Если ошибка не DomainError или нет маппинга - пробрасываем дальше
  throw error;
}



/**
 * Тип для маппинга ServiceErrorCode на HTTP исключения
 */
export type ServiceErrorMapping = Partial<Record<DomainErrorCode, Error>>;

/**
 * Универсальный обработчик ошибок из доменного слоя
 * Обрабатывает: DomainError, Mongoose ошибки, MongoDB ошибки, HTTP исключения
 * 
 * @param error - Перехваченная ошибка
 * @param errorMapping - Объект с маппингом ServiceErrorCode -> HTTP Exception
 * 
 * @example
 * ```typescript
 * try {
 *   await this.articlePort.createArticle(command);
 * } catch (error) {
 *   handleServiceError(error, {
 *     [DomainErrorCode.NOT_FOUND]: new NotFoundException('Статья не найдена'),
 *     [DomainErrorCode.CONFLICT]: new ConflictException('Конфликт данных'),
 *     [DomainErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Такая статья уже существует'),
 *     [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
 *   });
 * }
 * ```
 */
export function handleServiceError(error: unknown, errorMapping: ServiceErrorMapping): never {
  // Динамический импорт для избежания циклических зависимостей
  const {
    HttpException,
    NotFoundException,
    BadRequestException,
    ConflictException,
    InternalServerErrorException,
  } = require('@nestjs/common');
  
  const mongoose = require('mongoose');

  // 1. HTTP исключения NestJS - проверяем есть ли в маппинге
  if (error instanceof HttpException) {
    const mappedError = errorMapping[DomainErrorCode.HTTP_EXCEPTION];
    if (mappedError) {
      throw mappedError;
    }
    // Если нет в маппинге - пробрасываем как есть
    throw error;
  }

  // 2. DomainError - используем маппинг по коду
  if (error instanceof DomainError) {
    // Коды DomainError совпадают с частью ServiceErrorCode
    const mappedError = errorMapping[error.code as unknown as DomainErrorCode];
    if (mappedError) {
      throw mappedError;
    }
  }

  // 3. Mongoose ошибки
  if (error instanceof mongoose.Error) {
    if (error instanceof mongoose.Error.CastError) {
      const mappedError = errorMapping[DomainErrorCode.DB_CAST_ERROR];
      if (mappedError) throw mappedError;
      throw new BadRequestException('Некорректный идентификатор');
    }
    
    if (error instanceof mongoose.Error.ValidationError) {
      const mappedError = errorMapping[DomainErrorCode.DB_VALIDATION_ERROR];
      if (mappedError) throw mappedError;
      
      const validationError = error as any;
      const messages = Object.values(validationError.errors).map((err: any) => err.message).join(', ');
      throw new BadRequestException(`Ошибка валидации: ${messages}`);
    }
    
    if (error instanceof mongoose.Error.DocumentNotFoundError) {
      const mappedError = errorMapping[DomainErrorCode.DB_DOCUMENT_NOT_FOUND];
      if (mappedError) throw mappedError;
      throw new NotFoundException('Документ не найден');
    }
  }

  // 4. MongoDB ошибки
  if (error && typeof error === 'object' && 'code' in error) {
    const mongoError = error as any;
    
    // Duplicate key error (11000)
    if (mongoError.code === 11000) {
      const mappedError = errorMapping[DomainErrorCode.DB_DUPLICATE_KEY];
      if (mappedError) throw mappedError;
      
      const field = Object.keys(mongoError.keyPattern || {})[0] || 'поле';
      throw new ConflictException(`Запись с таким значением ${field} уже существует`);
    }
    
    // Connection errors
    if (mongoError.code === 'ECONNREFUSED' || mongoError.code === 'ETIMEDOUT') {
      const mappedError = errorMapping[DomainErrorCode.DB_CONNECTION_ERROR];
      if (mappedError) throw mappedError;
      throw new InternalServerErrorException('Ошибка подключения к базе данных');
    }
  }

  // 5. Неизвестные ошибки - проверяем маппинг OTHER
  const otherError = errorMapping[DomainErrorCode.OTHER];
  if (otherError) {
    throw otherError;
  }
  
  // Если нет маппинга OTHER - пробрасываем оригинальную ошибку
  throw error;
}