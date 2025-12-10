# Этап 0.3: Общие утилиты

## Краткое содержание

Создание/обновление общих утилит в `src/common/`: обработка ошибок, декораторы, guards, базовые типы. Это переиспользуемые компоненты для всех модулей.

## Предполагаемый результат

- DomainError и handleServiceError готовы
- Декораторы @GetUser(), @UserType() работают
- Guards: JwtAuthGuard, TypeGuard настроены
- Базовые типы: Pagination, city, деньги в копейках

---

## 1. Структура common/

```
src/common/
├── index.ts              # Barrel export
├── constants/
│   └── index.ts          # AUTH_CODE_EXPIRES_IN, DEFAULT_TAX, etc.
├── decorators/
│   ├── index.ts
│   ├── get-user.decorator.ts
│   ├── user-type.decorator.ts
│   ├── roles.decorator.ts
│   ├── public.decorator.ts
│   └── expose-object-id.decorator.ts
├── enums/
│   ├── index.ts
│   ├── user-type.enum.ts
│   ├── block-status.enum.ts
│   └── city.enum.ts        # NEW
├── errors/
│   ├── index.ts
│   ├── domain-error.ts
│   ├── handle-service-error.ts
│   └── domain-error.filter.ts
├── guards/
│   ├── index.ts
│   ├── jwt-auth.guard.ts
│   ├── type.guard.ts
│   └── roles.guard.ts
├── schemas/
│   ├── index.ts
│   ├── blocked.schema.ts
│   ├── address.schema.ts
│   └── money.schema.ts     # NEW
├── types/
│   ├── index.ts
│   ├── authenticated-user.type.ts
│   ├── pagination.type.ts
│   └── common-options.type.ts
└── utils/
    ├── index.ts
    ├── check-id.ts
    ├── generate-auth-code.ts
    └── money.utils.ts      # NEW
```

---

## 2. Domain Error

```typescript
// src/common/errors/domain-error.ts
export enum DomainErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  INVARIANT = 'INVARIANT',      // Бизнес-правило нарушено
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  DB_CAST_ERROR = 'DB_CAST_ERROR',
  OTHER = 'OTHER',
}

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static notFound(entity: string, id?: string): DomainError {
    return new DomainError(
      DomainErrorCode.NOT_FOUND,
      `${entity} not found${id ? `: ${id}` : ''}`,
      { entity, id },
    );
  }

  static invariant(message: string, details?: Record<string, any>): DomainError {
    return new DomainError(DomainErrorCode.INVARIANT, message, details);
  }

  static validation(message: string, details?: Record<string, any>): DomainError {
    return new DomainError(DomainErrorCode.VALIDATION, message, details);
  }
}
```

---

## 3. Handle Service Error

```typescript
// src/common/errors/handle-service-error.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DomainError, DomainErrorCode } from './domain-error';

type ErrorMapping = Partial<Record<DomainErrorCode, Error>>;

export function handleServiceError(error: unknown, mapping: ErrorMapping): never {
  // Если это DomainError — маппим на HTTP исключение
  if (error instanceof DomainError) {
    const httpError = mapping[error.code];
    if (httpError) {
      throw httpError;
    }
  }

  // MongoDB CastError (неверный ObjectId)
  if (error instanceof Error && error.name === 'CastError') {
    const httpError = mapping[DomainErrorCode.DB_CAST_ERROR];
    if (httpError) {
      throw httpError;
    }
    throw new BadRequestException('Invalid ID format');
  }

  // Неизвестная ошибка
  console.error('Unhandled error:', error);
  throw new InternalServerErrorException('Internal server error');
}
```

### Использование в RoleService

```typescript
// src/interface/http/customer/customer.role.service.ts
async getProfile(userId: string): Promise<CustomerResponseDto> {
  try {
    const customer = await this.customerPort.getById(
      new CustomerQueries.GetByIdQuery(userId),
    );
    return this.mapToDto(customer);
  } catch (error) {
    handleServiceError(error, {
      [DomainErrorCode.NOT_FOUND]: new NotFoundException('Customer not found'),
      [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Invalid customer ID'),
    });
  }
}
```

---

## 4. City Enum

```typescript
// src/common/enums/city.enum.ts
export enum City {
  ALMATY = 'almaty',
  ASTANA = 'astana',
  SHYMKENT = 'shymkent',
  // Добавлять по мере расширения
}

export const CITY_DISPLAY_NAMES: Record<City, string> = {
  [City.ALMATY]: 'Алматы',
  [City.ASTANA]: 'Астана',
  [City.SHYMKENT]: 'Шымкент',
};
```

---

## 5. Money Utils (копейки)

```typescript
// src/common/utils/money.utils.ts

/**
 * Все деньги храним в копейках (Int).
 * Конвертация только на границе системы (API).
 */

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number, currency = '₸'): string {
  return `${fromCents(cents).toFixed(2)} ${currency}`;
}

// Для Response DTOs
export class MoneyDto {
  @Expose()
  cents: number;

  @Expose()
  formatted: string;

  static from(cents: number): MoneyDto {
    const dto = new MoneyDto();
    dto.cents = cents;
    dto.formatted = formatMoney(cents);
    return dto;
  }
}
```

---

## 6. Money Schema (подсхема)

```typescript
// src/common/schemas/money.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Подсхема для денежных сумм.
 * Всегда хранит в копейках.
 */
@Schema({ _id: false })
export class Money {
  @Prop({ type: Number, required: true, min: 0 })
  amount: number; // в копейках

  @Prop({ type: String, default: 'KZT' })
  currency: string;
}

export const MoneySchema = SchemaFactory.createForClass(Money);
```

---

## 7. Pagination Types

```typescript
// src/common/types/pagination.type.ts
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate<T>(
  items: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / options.limit);
  return {
    items,
    total,
    page: options.page,
    limit: options.limit,
    totalPages,
    hasNext: options.page < totalPages,
    hasPrev: options.page > 1,
  };
}
```

---

## 8. Common Query/Command Options

```typescript
// src/common/types/common-options.type.ts
import { ClientSession } from 'mongoose';
import { City } from '../enums/city.enum';

/**
 * Общие опции для Commands
 */
export interface CommonCommandOptions {
  session?: ClientSession;
}

/**
 * Общие опции для Queries
 */
export interface CommonQueryOptions {
  session?: ClientSession;
}

/**
 * Опции с фильтрацией по городу
 */
export interface CityFilterOptions {
  city?: City;
}
```

---

## 9. Декораторы (существующие)

```typescript
// src/common/decorators/get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

```typescript
// src/common/decorators/user-type.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const USER_TYPE_KEY = 'userType';
export const UserType = (...types: string[]) => SetMetadata(USER_TYPE_KEY, types);
```

---

## 10. Guards (существующие)

```typescript
// src/common/guards/type.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_TYPE_KEY } from '../decorators/user-type.decorator';

@Injectable()
export class TypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<string[]>(USER_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredTypes.includes(user?.type);
  }
}
```

---

## 11. Barrel Export

```typescript
// src/common/index.ts

// Constants
export * from './constants';

// Decorators
export * from './decorators';

// Enums
export * from './enums';

// Errors
export * from './errors';

// Guards
export * from './guards';

// Schemas
export * from './schemas';

// Types
export * from './types';

// Utils
export * from './utils';
```

---

## Чеклист готовности

- [ ] DomainError и handleServiceError работают
- [ ] City enum создан
- [ ] Money utils для копеек готовы
- [ ] Pagination types готовы
- [ ] Все декораторы работают
- [ ] Все guards работают
- [ ] Barrel export настроен
- [ ] Тест: handleServiceError маппит DomainError → HttpException
