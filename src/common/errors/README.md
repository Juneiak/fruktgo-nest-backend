# Обработка ошибок / Error Handling

Централизованное место для всех классов и утилит, связанных с обработкой ошибок в приложении.

## 📁 Структура файлов

```
src/common/errors/
├── domain-error.ts          # DomainError класс и enum DomainErrorCode
├── domain-error.filter.ts   # Global Exception Filter для автоматической обработки
├── index.ts                 # Централизованный экспорт
└── README.md               # Этот файл
```

---

## 📦 Экспорты

### `domain-error.ts`

```typescript
export enum DomainErrorCode {
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

export type DomainErrorMeta = { entity?: string; id?: string; ... };

export class DomainError extends Error { ... }
export const isDomainError = (e: unknown): e is DomainError => ...
```

**Фабричные методы:**
- `DomainError.notFound(entity, id, details?)`
- `DomainError.conflict(message?, meta?, details?)`
- `DomainError.forbidden(message?, meta?)`
- `DomainError.unauthorized(message?, meta?)`
- `DomainError.validation(message?, details?, meta?)`
- `DomainError.invariant(message?, details?, meta?)`
- `DomainError.concurrency(message?, meta?)`
- `DomainError.badRequest(message?, meta?)`

### `domain-error.filter.ts`

```typescript
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(err: DomainError, host: ArgumentsHost) { ... }
  private mapStatus(code: DomainError['code']): number { ... }
}
```

Global Exception Filter который автоматически перехватывает `DomainError` и конвертирует в HTTP-ответы:
- `NOT_FOUND` → 404
- `CONFLICT` / `CONCURRENCY` → 409
- `FORBIDDEN` → 403
- `UNAUTHORIZED` → 401
- `VALIDATION` / `INVARIANT` / `BAD_REQUEST` → 400
- `RATE_LIMITED` → 429
- `DEPENDENCY_FAILED` → 424
- `UNAVAILABLE` → 503
- Остальные → 500

### `index.ts`

Централизованный экспорт всех ошибок:

```typescript
export {
  DomainError,
  isDomainError,
  DomainErrorCode,
  type DomainErrorMeta,
} from './domain-error';

export { DomainErrorFilter } from './domain-error.filter';
```

---

## 🎯 Использование

### В доменном слое (Service/Port)

```typescript
import { DomainError, DomainErrorCode } from 'src/common/errors';

class ArticleService {
  async getArticle(id: string): Promise<Article> {
    const article = await this.articleModel.findById(id);
    
    if (!article) {
      // Используем фабричный метод (рекомендуемо)
      throw DomainError.notFound('Article', id);
      
      // Или напрямую с enum
      // throw new DomainError({ 
      //   code: DomainErrorCode.NOT_FOUND, 
      //   message: 'Article not found' 
      // });
    }
    
    return article;
  }
}
```

### Регистрация Global Filter

```typescript
// main.ts
import { DomainErrorFilter } from './common/errors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Регистрируем глобальный фильтр
  app.useGlobalFilters(
    new DomainErrorFilter(),        // Обработка доменных ошибок
    new MongooseExceptionFilter(),  // Обработка ошибок Mongoose
  );
  
  await app.listen(3000);
}
```

### В HTTP-слое (Role Service)

```typescript
// Никаких try-catch блоков не нужно!
class AdminArticlesRoleService {
  async getArticle(articleId: string): Promise<ArticleDto> {
    const article = await this.articlePort.getArticle(articleId);
    if (!article) throw new NotFoundException('Статья не найдена');
    
    return plainToInstance(ArticleDto, article);
  }
  
  // DomainErrorFilter автоматически перехватит любые DomainError
}
```

---

## ✨ Преимущества

1. **Централизация** - вся логика обработки ошибок в одном месте (DomainErrorFilter)
2. **Типобезопасность** - TypeScript проверяет коды ошибок через enum `DomainErrorCode`
3. **Разделение concerns** - доменный слой не знает об HTTP, сервисы не содержат HTTP-логику
4. **Exhaustiveness checking** - TypeScript предупредит если не обработан какой-то код ошибки из enum
5. **Легко расширяемо** - добавить новый код ошибки в enum `DomainErrorCode`
6. **Autocomplete** - IDE подсказывает все доступные коды ошибок
7. **Меньше boilerplate** - не нужны try-catch блоки в каждом методе
8. **Стандарт NestJS** - использует встроенный механизм Exception Filters

---

## 📚 Полная документация

См. [docs/http-error-handling.md](../../../docs/http-error-handling.md) для подробной документации с примерами.
