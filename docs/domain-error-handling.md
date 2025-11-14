# Обработка ошибок сервисов (Service Error Handling)

## Концепция

В проекте используется подход с разделением ответственности между слоями:
- **Доменный слой** выбрасывает `DomainError` с кодом ошибки
- **Слой представления (Role Services)** перехватывает и преобразует в HTTP исключения

## Утилита `handleServiceError` (Рекомендуется)

### Описание

```typescript
function handleServiceError(error: unknown, errorMapping: ServiceErrorMapping): never
```

**Универсальный обработчик всех типов ошибок** из доменного слоя. Обрабатывает:
- ✅ `DomainError` - доменные ошибки с кодами
- ✅ `Mongoose.Error` - ошибки валидации, CastError, DocumentNotFoundError
- ✅ `MongoDB errors` - duplicate key (11000), connection errors
- ✅ `HttpException` - HTTP исключения NestJS

### Доступные коды ошибок

```typescript
enum ServiceErrorCode {
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
  
  // HTTP коды
  HTTP_EXCEPTION = 'HTTP_EXCEPTION',               // Любое NestJS HTTP исключение
}
```

### Примеры использования handleServiceError

#### 1. Базовый пример - доменные ошибки

```typescript
import { NotFoundException } from '@nestjs/common';
import { ServiceErrorCode, handleServiceError } from 'src/common/errors/domain-error';

async getArticle(articleId: string): Promise<ArticleDto> {
  try {
    const article = await this.articlePort.getArticle(
      new ArticleQueries.GetArticleQuery(articleId)
    );
    return plainToInstance(ArticleDto, article);
  } catch (error) {
    handleServiceError(error, {
      [ServiceErrorCode.NOT_FOUND]: new NotFoundException('Статья не найдена'),
      [ServiceErrorCode.DB_CAST_ERROR]: new NotFoundException('Некорректный ID статьи'),
    });
  }
}
```

#### 2. Обработка ошибок базы данных

```typescript
async createArticle(dto: CreateArticleDto): Promise<ArticleDto> {
  try {
    const article = await this.articlePort.createArticle(
      new ArticleCommands.CreateArticleCommand(dto)
    );
    return plainToInstance(ArticleDto, article);
  } catch (error) {
    handleServiceError(error, {
      // Доменные ошибки
      [ServiceErrorCode.CONFLICT]: new ConflictException('Конфликт данных'),
      
      // Ошибки базы данных
      [ServiceErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Статья с таким названием уже существует'),
      [ServiceErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных'),
    });
  }
}
```

#### 3. Комплексный пример

```typescript
async assignEmployee(sellerId: string, employeeId: string) {
  try {
    await this.jobApplicationPort.createJobApplication(
      new JobApplicationCommands.CreateJobApplicationCommand({
        sellerId,
        employeeId,
      })
    );
  } catch (error) {
    handleServiceError(error, {
      // Доменные ошибки
      [ServiceErrorCode.NOT_FOUND]: new NotFoundException('Продавец или сотрудник не найден'),
      [ServiceErrorCode.CONFLICT]: new ConflictException('Сотрудник уже работает'),
      [ServiceErrorCode.INVARIANT]: new BadRequestException('Нарушены бизнес-правила'),
      
      // База данных
      [ServiceErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Заявка уже существует'),
      [ServiceErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
    });
  }
}
```

### Поведение handleServiceError

1. **HTTP исключения**: Если в маппинге есть `HTTP_EXCEPTION` - выбрасывает его, иначе пробрасывает оригинальную ошибку
2. **DomainError**: Ищет код в маппинге и выбрасывает соответствующее исключение
3. **Mongoose ошибки**: 
   - Проверяет маппинг (DB_CAST_ERROR, DB_VALIDATION_ERROR, DB_DOCUMENT_NOT_FOUND)
   - Если нет в маппинге - выбрасывает дефолтное исключение
4. **MongoDB ошибки**: Обрабатывает duplicate key (11000), connection errors
5. **Неизвестные ошибки**: Пробрасывает без изменений

### Преимущества handleServiceError

✅ **Универсальность** - обрабатывает все типы ошибок
✅ **Типобезопасность** - TypeScript автокомплит для всех кодов
✅ **DRY** - один обработчик вместо нескольких
✅ **Гибкость** - разные сообщения для разных контекстов
✅ **Fallback** - автоматические дефолтные сообщения

---

## Утилита `handleDomainError` (Для простых случаев)

### Описание

```typescript
function handleDomainError(error: unknown, errorMapping: DomainErrorMapping): never
```

Специализированный обработчик только для `DomainError`. Используйте когда нужно обработать только доменные ошибки.

### Параметры

- `error: unknown` - Перехваченная ошибка из доменного слоя
- `errorMapping: Partial<Record<DomainErrorCode, Error>>` - Объект с маппингом кодов на HTTP исключения

### Доступные коды ошибок

```typescript
enum DomainErrorCode {
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
}
```

## Примеры использования

### 1. Базовый пример - одна ошибка

```typescript
import { NotFoundException } from '@nestjs/common';
import { DomainErrorCode, handleDomainError } from 'src/common/errors/domain-error';

async getCustomer(customerId: string): Promise<CustomerDto> {
  try {
    const customer = await this.customerPort.getCustomer(
      new CustomerQueries.GetCustomerQuery({ customerId })
    );
    return plainToInstance(CustomerDto, customer);
  } catch (error) {
    handleDomainError(error, {
      [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
    });
  }
}
```

### 2. Множественные ошибки

```typescript
import { 
  NotFoundException, 
  ConflictException, 
  ForbiddenException 
} from '@nestjs/common';

async updateCustomer(customerId: string, dto: UpdateDto): Promise<CustomerDto> {
  try {
    await this.customerPort.updateCustomer(
      new CustomerCommands.UpdateCustomerCommand(customerId, dto)
    );
    return this.getCustomer(customerId);
  } catch (error) {
    handleDomainError(error, {
      [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
      [DomainErrorCode.CONFLICT]: new ConflictException('Конфликт данных'),
      [DomainErrorCode.FORBIDDEN]: new ForbiddenException('Операция запрещена'),
    });
  }
}
```

### 3. Вспомогательный метод для переиспользования

```typescript
export class AdminCustomersRoleService {
  
  // Публичные методы
  async getCustomer(customerId: string): Promise<CustomerDto> {
    const customer = await this.ensureCustomerExists(customerId);
    return plainToInstance(CustomerDto, customer);
  }

  async updateCustomer(customerId: string, dto: UpdateDto): Promise<CustomerDto> {
    await this.ensureCustomerExists(customerId);
    // ... update logic
  }

  // Приватный вспомогательный метод
  private async ensureCustomerExists(customerId: string) {
    try {
      return await this.customerPort.getCustomer(
        new CustomerQueries.GetCustomerQuery({ customerId })
      );
    } catch (error) {
      handleDomainError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
      });
    }
  }
}
```

### 4. Сложный пример с разными сообщениями

```typescript
async assignEmployee(sellerId: string, employeeId: string) {
  try {
    await this.jobApplicationPort.createJobApplication(
      new JobApplicationCommands.CreateJobApplicationCommand({
        sellerId,
        employeeId,
      })
    );
  } catch (error) {
    handleDomainError(error, {
      [DomainErrorCode.NOT_FOUND]: new NotFoundException(
        'Продавец или сотрудник не найден'
      ),
      [DomainErrorCode.CONFLICT]: new ConflictException(
        'Сотрудник уже работает у другого продавца'
      ),
      [DomainErrorCode.INVARIANT]: new BadRequestException(
        'Невозможно создать заявку: нарушены бизнес-правила'
      ),
    });
  }
}
```

## Поведение утилиты

1. **DomainError с маппингом**: Выбрасывает соответствующее HTTP исключение
2. **DomainError без маппинга**: Пробрасывает оригинальную ошибку дальше
3. **Другие ошибки**: Пробрасывает без изменений

```typescript
// Пример: если DomainError.VALIDATION не в маппинге
try {
  await someOperation();
} catch (error) {
  handleDomainError(error, {
    [DomainErrorCode.NOT_FOUND]: new NotFoundException('Not found'),
    // VALIDATION не указан - будет проброшена оригинальная DomainError
  });
}
```

## Преимущества

### ✅ DRY принцип
- Избегаем дублирования логики перехвата ошибок
- Единообразная обработка во всех сервисах

### ✅ Читаемость
- Декларативный подход: явно видно какие ошибки обрабатываются
- Легко добавлять новые маппинги

### ✅ Типобезопасность
- TypeScript проверяет коды ошибок
- Автокомплит для `DomainErrorCode`

### ✅ Гибкость
- Разные сообщения для одного кода в разных контекстах
- Легко расширять маппинг

## Антипаттерны

### ❌ Плохо: Ручная проверка каждой ошибки

```typescript
// Не делайте так
try {
  await operation();
} catch (error) {
  if (error instanceof DomainError) {
    if (error.code === DomainErrorCode.NOT_FOUND) {
      throw new NotFoundException('Not found');
    }
    if (error.code === DomainErrorCode.CONFLICT) {
      throw new ConflictException('Conflict');
    }
  }
  throw error;
}
```

### ✅ Хорошо: Использование утилиты

```typescript
try {
  await operation();
} catch (error) {
  handleDomainError(error, {
    [DomainErrorCode.NOT_FOUND]: new NotFoundException('Not found'),
    [DomainErrorCode.CONFLICT]: new ConflictException('Conflict'),
  });
}
```

## Связь с глобальным фильтром

В `main.ts` можно включить `DomainErrorFilter` для автоматической обработки:

```typescript
app.useGlobalFilters(
  new DomainErrorFilter(), // Автоматически преобразует DomainError в HTTP
);
```

Однако рекомендуется использовать `handleDomainError` в Role Services для:
- Контроля над сообщениями для пользователя
- Различных сообщений в разных контекстах
- Явного контроля обработки ошибок

## См. также

- `src/common/errors/domain-error.ts` - определение DomainError
- `src/common/errors/domain-error.filter.ts` - глобальный фильтр
- Примеры в `src/interface/http/admin/customers/admin.customers.role.service.ts`
