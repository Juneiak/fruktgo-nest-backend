# Краткое руководство: handleServiceError

## Что это?

`handleServiceError` - универсальный обработчик ошибок для Role Services, который перехватывает:
- ✅ Доменные ошибки (`DomainError`)
- ✅ Ошибки Mongoose (`CastError`, `ValidationError`)
- ✅ Ошибки MongoDB (duplicate key, connection)
- ✅ HTTP исключения NestJS

## Быстрый старт

### 1. Импорт

```typescript
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import { NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
```

### 2. Базовое использование

```typescript
async getArticle(articleId: string): Promise<ArticleDto> {
  try {
    const article = await this.articlePort.getArticle(
      new ArticleQueries.GetArticleQuery(articleId)
    );
    return plainToInstance(ArticleDto, article);
  } catch (error) {
    handleServiceError(error, {
      [DomainErrorCode.NOT_FOUND]: new NotFoundException('Статья не найдена'),
      [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
      [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка при получении статьи'),
    });
  }
}
```

## Доступные коды ошибок

### Доменные ошибки
```typescript
DomainErrorCode.NOT_FOUND           // Не найдено
DomainErrorCode.CONFLICT            // Конфликт данных
DomainErrorCode.FORBIDDEN           // Запрещено
DomainErrorCode.UNAUTHORIZED        // Не авторизован
DomainErrorCode.VALIDATION          // Ошибка валидации
DomainErrorCode.INVARIANT           // Нарушен инвариант
DomainErrorCode.BAD_REQUEST         // Неверный запрос
```

### Ошибки базы данных
```typescript
DomainErrorCode.DB_DUPLICATE_KEY       // Дубликат ключа (11000)
DomainErrorCode.DB_CAST_ERROR          // Некорректный ID/тип
DomainErrorCode.DB_VALIDATION_ERROR    // Ошибка валидации схемы
DomainErrorCode.DB_DOCUMENT_NOT_FOUND  // Документ не найден
DomainErrorCode.DB_CONNECTION_ERROR    // Ошибка подключения
```

### HTTP ошибки
```typescript
DomainErrorCode.HTTP_EXCEPTION      // Переопределить HTTP исключение
```

### Fallback ошибки
```typescript
DomainErrorCode.OTHER               // Все остальные необработанные ошибки
```

## Типичные сценарии

### Сценарий 1: Получение одной сущности

```typescript
async getCustomer(customerId: string) {
  try {
    const customer = await this.customerPort.getCustomer(query);
    return plainToInstance(CustomerDto, customer);
  } catch (error) {
    handleServiceError(error, {
      [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
      [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
    });
  }
}
```

### Сценарий 2: Создание сущности

```typescript
async createArticle(dto: CreateArticleDto) {
  try {
    const article = await this.articlePort.createArticle(command);
    return plainToInstance(ArticleDto, article);
  } catch (error) {
    handleServiceError(error, {
      // Дубликат в БД
      [DomainErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Статья с таким названием уже существует'),
      
      // Ошибка валидации схемы Mongoose
      [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных'),
      
      // Доменные правила
      [DomainErrorCode.INVARIANT]: new BadRequestException('Нарушены бизнес-правила'),
    });
  }
}
```

### Сценарий 3: Обновление сущности

```typescript
async updateCustomer(customerId: string, dto: UpdateDto) {
  try {
    await this.customerPort.updateCustomer(command);
    return this.getCustomer(customerId);
  } catch (error) {
    handleServiceError(error, {
      [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
      [DomainErrorCode.CONFLICT]: new ConflictException('Конфликт версий'),
      [DomainErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Email уже используется'),
    });
  }
}
```

### Сценарий 4: Сложная бизнес-логика

```typescript
async assignEmployee(sellerId: string, employeeId: string) {
  try {
    await this.jobApplicationPort.createJobApplication(command);
  } catch (error) {
    handleServiceError(error, {
      // Не найдены связанные сущности
      [DomainErrorCode.NOT_FOUND]: new NotFoundException('Продавец или сотрудник не найден'),
      
      // Нарушение бизнес-правил
      [DomainErrorCode.CONFLICT]: new ConflictException('Сотрудник уже работает у другого продавца'),
      [DomainErrorCode.INVARIANT]: new BadRequestException('Невозможно создать заявку'),
      
      // БД ошибки
      [DomainErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Заявка уже существует'),
      [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные ID'),
      
      // Все остальные ошибки
      [DomainErrorCode.OTHER]: new InternalServerErrorException('Ошибка при назначении сотрудника'),
    });
  }
}
```

### Сценарий 5: Использование OTHER для единообразных ошибок

```typescript
async someOperation() {
  try {
    // Сложная операция с множеством возможных ошибок
    await this.complexDomainLogic();
  } catch (error) {
    handleServiceError(error, {
      // Обрабатываем только критичные ошибки
      [DomainErrorCode.NOT_FOUND]: new NotFoundException('Ресурс не найден'),
      
      // Все остальное - общая ошибка
      [DomainErrorCode.OTHER]: new BadRequestException('Операция не может быть выполнена'),
    });
  }
}
```

## Важные моменты

### ✅ Типизация

TypeScript будет автоматически подсказывать доступные коды:

```typescript
handleServiceError(error, {
  [DomainErrorCode.  // <-- автокомплит!
```

### ✅ Fallback поведение с ключом OTHER

Используйте `DomainErrorCode.OTHER` для обработки всех необработанных ошибок:

```typescript
try {
  await someOperation();
} catch (error) {
  handleServiceError(error, {
    [DomainErrorCode.NOT_FOUND]: new NotFoundException('Не найдено'),
    [DomainErrorCode.CONFLICT]: new ConflictException('Конфликт'),
    // Все остальные ошибки
    [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
  });
}
```

**Без ключа OTHER**: Необработанные ошибки пробрасываются дальше
**С ключом OTHER**: Все необработанные ошибки преобразуются в указанное исключение

### ✅ Автоматические дефолтные сообщения

Если ошибка не указана в маппинге и нет `OTHER`, используются дефолтные сообщения:

- `DB_CAST_ERROR` → `BadRequestException('Некорректный идентификатор')`
- `DB_DUPLICATE_KEY` → `ConflictException('Запись с таким значением поле уже существует')`
- `DB_VALIDATION_ERROR` → `BadRequestException('Ошибка валидации: ...')`
- `DB_DOCUMENT_NOT_FOUND` → `NotFoundException('Документ не найден')`
- `DB_CONNECTION_ERROR` → `InternalServerErrorException('Ошибка подключения к базе данных')`

### ✅ Вспомогательные методы

Создавайте переиспользуемые методы:

```typescript
export class AdminCustomersRoleService {
  // Публичные методы
  async getCustomer(customerId: string) {
    const customer = await this.ensureCustomerExists(customerId);
    return plainToInstance(CustomerDto, customer);
  }

  async updateCustomer(customerId: string, dto: UpdateDto) {
    await this.ensureCustomerExists(customerId);
    // ... update logic
  }

  // Приватный вспомогательный метод
  private async ensureCustomerExists(customerId: string) {
    try {
      return await this.customerPort.getCustomer(query);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
      });
    }
  }
}
```

## Когда НЕ использовать

❌ **Не используйте в доменном слое** - доменный слой должен выбрасывать `DomainError`

❌ **Не используйте для логирования** - это только для преобразования ошибок

❌ **Не используйте если нужна дополнительная логика** - в таких случаях обрабатывайте ошибки вручную

## Миграция с старого кода

### Было (плохо):
```typescript
try {
  await operation();
} catch (error) {
  throw new InternalServerErrorException(error); // 500 для всех!
}
```

### Стало (хорошо):
```typescript
try {
  await operation();
} catch (error) {
  handleServiceError(error, {
    [DomainErrorCode.NOT_FOUND]: new NotFoundException('Не найдено'),
    [DomainErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Дубликат'),
    [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка'),
  });
}
```

## Быстрый чеклист

- [ ] Импортировать `DomainErrorCode` и `handleServiceError`
- [ ] Обернуть вызов доменного слоя в `try-catch`
- [ ] Добавить маппинг для ожидаемых ошибок
- [ ] Добавить `[DomainErrorCode.OTHER]` для общих случаев (опционально)
- [ ] Использовать правильные HTTP исключения (404, 400, 409, 500)
- [ ] Написать понятные сообщения для пользователей

## См. также

- [domain-error-handling.md](./domain-error-handling.md) - Полная документация
- `src/common/errors/domain-error.ts` - Исходный код
- Примеры в `src/interface/http/admin/*/` - Role services
