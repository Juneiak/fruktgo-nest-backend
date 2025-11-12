# Обработка ошибок в HTTP-слое

## 📋 Обзор

Все методы в HTTP-слое (role services) должны обрабатывать доменные ошибки и конвертировать их в соответствующие HTTP-исключения NestJS.

---

## 🎯 Утилита handleDomainError

### Расположение
```typescript
import { handleDomainError } from "src/common/errors";
```

**Примечание:** Также доступен re-export из `src/common/utils` для обратной совместимости.

### Назначение

Функция `handleDomainError` автоматически конвертирует:
- **DomainError** → соответствующее HTTP-исключение NestJS
- **Существующие HTTP-исключения** → прокидывает без изменений
- **Обычные Error** → InternalServerErrorException
- **Неизвестные ошибки** → InternalServerErrorException

### Маппинг ошибок

| DomainError Code | HTTP Exception | Status Code |
|------------------|----------------|-------------|
| `NOT_FOUND` | `NotFoundException` | 404 |
| `CONFLICT` | `ConflictException` | 409 |
| `FORBIDDEN` | `ForbiddenException` | 403 |
| `UNAUTHORIZED` | `UnauthorizedException` | 401 |
| `VALIDATION` | `BadRequestException` | 400 |
| `INVARIANT` | `BadRequestException` | 400 |
| `BAD_REQUEST` | `BadRequestException` | 400 |
| `CONCURRENCY` | `ConflictException` | 409 |
| `DEPENDENCY_FAILED` | `InternalServerErrorException` | 500 |
| `RATE_LIMITED` | `InternalServerErrorException` | 500 |
| `UNAVAILABLE` | `InternalServerErrorException` | 500 |

---

## ✅ Паттерн использования

### Базовый паттерн

```typescript
import { handleDomainError } from "src/common/errors";

async methodName(...): Promise<ResultType> {
  try {
    // Бизнес-логика
    const result = await this.port.someMethod();
    return result;
  } catch (error) {
    handleDomainError(error);
  }
}
```

### ⚠️ Важно

1. **Всегда оборачивайте в try-catch**: Каждый метод role service должен иметь try-catch блок
2. **handleDomainError в конце**: Вызывайте handleDomainError в блоке catch
3. **Никаких дополнительных обработок**: handleDomainError бросает исключение, не требует return

---

## 📝 Примеры

### Admin Articles Role Service

```typescript
import { handleDomainError } from "src/common/errors";

@Injectable()
export class AdminArticlesRoleService {
  
  async getArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
  ): Promise<ArticleFullResponseDto> {
    try {
      checkId([articleId]);

      const article = await this.articlePort.getArticle(articleId);
      if (!article) throw new NotFoundException('Статья не найдена');

      return plainToInstance(ArticleFullResponseDto, article);
    } catch (error) {
      handleDomainError(error);
    }
  }

  async createArticle(
    authedAdmin: AuthenticatedUser,
    dto: CreateArticleDto,
    articleImage?: Express.Multer.File,
  ): Promise<ArticleFullResponseDto> {
    try {
      const command = new CreateArticleCommand({
        title: dto.title,
        content: dto.content,
        targetAudience: dto.targetAudience,
        tags: dto.tags || [],
        articleImageFile: articleImage,
      });

      const article = await this.articlePort.createArticle(command);

      return plainToInstance(ArticleFullResponseDto, article);
    } catch (error) {
      handleDomainError(error);
    }
  }
}
```

### Public Articles Role Service

```typescript
import { handleDomainError } from "src/common/errors";

@Injectable()
export class PublicArticlesRoleService {
  
  async getPublishedArticle(articleId: string): Promise<ArticleFullResponseDto> {
    try {
      checkId([articleId]);
      
      const article = await this.articlePort.getArticle(articleId);
      
      if (!article || article.status !== ArticleStatus.PUBLISHED) {
        throw new NotFoundException('Статья не найдена');
      }

      // Асинхронное увеличение счетчика просмотров
      this.articlePort.incrementView(articleId).catch(() => {
        // Игнорируем ошибку
      });
      
      return plainToInstance(ArticleFullResponseDto, article, { excludeExtraneousValues: true });
    } catch (error) {
      handleDomainError(error);
    }
  }

  async getPublishedArticles(
    queryDto: PublicArticlesQueryDto,
    paginationDto: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ArticlePreviewResponseDto>> {
    try {
      const query = new GetArticlesQuery({
        statuses: [ArticleStatus.PUBLISHED],
        targetAudience: queryDto.targetAudience,
      });

      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationDto,
      };
      
      const result = await this.articlePort.getArticles(query, queryOptions);
      
      return transformPaginatedResult(result, ArticlePreviewResponseDto);
    } catch (error) {
      handleDomainError(error);
    }
  }
}
```

---

## 🔍 Как это работает

### 1. Доменная ошибка из service layer

```typescript
// В article.service.ts
if (!article) {
  throw DomainError.notFound('Article', articleId);
}
```

### 2. Перехват в HTTP-слое

```typescript
// В admin.articles.role.service.ts
try {
  const article = await this.articlePort.getArticle(articleId);
  if (!article) throw new NotFoundException('Статья не найдена');
  return plainToInstance(ArticleFullResponseDto, article);
} catch (error) {
  handleDomainError(error); // Конвертирует DomainError → NotFoundException
}
```

### 3. Клиент получает HTTP-ответ

```json
{
  "statusCode": 404,
  "message": "Статья не найдена",
  "error": "Not Found"
}
```

---

## ✨ Преимущества

1. **Единообразие**: Все HTTP-ошибки обрабатываются одинаково
2. **Типобезопасность**: TypeScript контролирует типы ошибок
3. **Разделение concerns**: Доменный слой не знает об HTTP
4. **Легко тестировать**: Можно мокировать handleDomainError
5. **Централизованная логика**: Изменения в одном месте

---

## 📚 Связанные файлы

- `src/common/errors/handle-domain-error.ts` - утилита конвертации ошибок
- `src/common/errors/domain-error.ts` - определение DomainError и DOMAIN_ERROR_CODES
- `src/common/errors/index.ts` - централизованный экспорт
- `src/interface/http/admin/articles/admin.articles.role.service.ts` - пример использования (admin)
- `src/interface/http/public/aticles/public.aticles.role.service.ts` - пример использования (public)

---

## 🎯 Чеклист для новых role services

- [ ] Импортировать `handleDomainError` из `src/common/errors`
- [ ] Обернуть каждый метод в `try-catch`
- [ ] Вызвать `handleDomainError(error)` в блоке `catch`
- [ ] Убедиться, что специфичные HTTP-исключения (NotFoundException) бросаются явно
- [ ] Проверить, что доменные ошибки корректно конвертируются

---

## ⚡ Quick Reference

```typescript
import { handleDomainError } from "src/common/errors";

// ✅ ПРАВИЛЬНО
async method(): Promise<Result> {
  try {
    // логика
    return result;
  } catch (error) {
    handleDomainError(error);
  }
}

// ❌ НЕПРАВИЛЬНО - без try-catch
async method(): Promise<Result> {
  const result = await this.port.method();
  return result;
}

// ❌ НЕПРАВИЛЬНО - return после handleDomainError
async method(): Promise<Result> {
  try {
    return result;
  } catch (error) {
    return handleDomainError(error); // handleDomainError бросает, не возвращает
  }
}
```
