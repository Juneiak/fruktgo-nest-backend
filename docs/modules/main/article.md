### CreateArticleCommand

Создание новой статьи.

```typescript
class CreateArticleCommand {
  constructor(
    public readonly payload: {
      title: string;                        // Заголовок
      content: string;                      // Полный текст
      targetAudience: ArticleTargetAudience; // Кому показывать
      tags: ArticlesTag[];                  // Теги
      articleImageFile?: Express.Multer.File; // Файл изображения (опционально)
    },
    public readonly articleId?: string      // Опциональный ID (для предопределения)
  )
}
```

**Бизнес-логика:**
- Автоматически создаётся `contentPreview` (первые 200 символов)
- Статус по умолчанию: `DRAFT`
- Если передан `articleImageFile`, загружается через `ImagesPort`
- Автор устанавливается как `ADMIN` (в будущем из контекста)

---

### UpdateArticleCommand

Обновление существующей статьи.

```typescript
class UpdateArticleCommand {
  constructor(
    public readonly articleId: string,
    public readonly payload: {
      title?: string;
      content?: string;
      targetAudience?: ArticleTargetAudience;
      tags?: ArticlesTag[];
      status?: ArticleStatus;
      articleImageFile?: Express.Multer.File | null; // null = удалить изображение
    }
  )
}
```

**Бизнес-логика:**
- Обновляются только переданные поля
- При изменении `content` автоматически обновляется `contentPreview`
- При изменении статуса на `PUBLISHED` устанавливается `publishedAt` (если не было)
- Если `articleImageFile === null`, старое изображение удаляется
- Если `articleImageFile === undefined`, изображение не меняется
- Если `articleImageFile` - новый файл, старое удаляется, новое загружается

---

### ChangeArticleStatusCommand

Изменение статуса публикации статьи.

```typescript
class ChangeArticleStatusCommand {
  constructor(
    public readonly articleId: string,
    public readonly payload: {
      status: ArticleStatus;
    }
  )
}
```

**Бизнес-логика:**
- При переходе в `PUBLISHED` устанавливается `publishedAt` (если ещё не было)
- Можно использовать для быстрого скрытия/публикации без полного `UpdateArticleCommand`

---

## 5. Queries (Read операции)

### GetArticleQuery

Получить одну статью по ID.

```typescript
class GetArticleQuery {
  constructor(
    public readonly articleId: string,
    public readonly options?: {
      select?: (keyof Article)[]  // Типобезопасный выбор полей
    }
  )
}
```

**Использование:**
```typescript
// Получить всю статью
new GetArticleQuery('507f1f77bcf86cd799439011')

// Получить только заголовок и контент
new GetArticleQuery('507f1f77bcf86cd799439011', {
  select: ['title', 'content', 'articleId']
})
```

---

### GetArticlesQuery

Получить список статей с фильтрами и пагинацией.

```typescript
class GetArticlesQuery {
  constructor(
    public readonly filters?: {
      statuses?: ArticleStatus[];          // Фильтр по статусам
      authorType?: ArticleAuthorType;      // Фильтр по типу автора
      targetAudience?: ArticleTargetAudience; // Фильтр по аудитории
      tags?: ArticlesTag[];                // Фильтр по тегам (хотя бы один совпадает)
      fromDate?: Date;                     // Статьи с даты
      toDate?: Date;                       // Статьи до даты
    },
    public readonly options?: {
      select?: (keyof Article)[]
    }
  )
}
```

**Использование:**
```typescript
// Все опубликованные статьи для клиентов с тегом RECIPES
new GetArticlesQuery({
  statuses: [ArticleStatus.PUBLISHED],
  targetAudience: ArticleTargetAudience.CUSTOMERS,
  tags: [ArticlesTag.RECIPES]
})

// Черновики за последний месяц
new GetArticlesQuery({
  statuses: [ArticleStatus.DRAFT],
  fromDate: new Date('2024-10-01')
})
```

**Пагинация и сортировка** передаются через `CommonListQueryOptions`:
```typescript
{
  pagination: { page: 1, pageSize: 10 },
  sort: { createdAt: -1 } // По умолчанию новые первые
}
```

---

## 6. Port (Интерфейс)

**Файл:** `article.port.ts`

```typescript
interface ArticlePort {
  // QUERIES
  getArticle(
    query: GetArticleQuery, 
    queryOptions?: CommonQueryOptions
  ): Promise<Article | null>;
  
  getArticles(
    query: GetArticlesQuery, 
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Article>>;

  // COMMANDS
  createArticle(
    command: CreateArticleCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<Article>;
  
  updateArticle(
    command: UpdateArticleCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  changeStatus(
    command: ChangeArticleStatusCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  deleteArticle(
    articleId: string, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  incrementView(
    articleId: string, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
}

export const ARTICLE_PORT = Symbol('ARTICLE_PORT');
```

### Injection

```typescript
constructor(
  @Inject(ARTICLE_PORT) private articlePort: ArticlePort
) {}
```

---

## 7. Service (Бизнес-логика)

**Файл:** `article.service.ts`

### Ключевые методы

#### createArticle

1. Генерирует `articleId` (или использует переданный)
2. Создаёт `contentPreview` из первых 200 символов
3. Если есть `articleImageFile`:
   - Загружает через `ImagesPort`
   - Устанавливает `articleImage = uploadedImageId`
4. Устанавливает `authorType = ADMIN`
5. Сохраняет в БД
6. Возвращает созданную статью

---

#### updateArticle

1. Проверяет существование статьи
2. Если изменяется `content`, пересчитывает `contentPreview`
3. Обрабатывает изменение изображения:
   - `null` → удаляет старое
   - `undefined` → не трогает
   - `new File` → удаляет старое, загружает новое
4. Если статус меняется на `PUBLISHED` и `publishedAt` пусто:
   - Устанавливает `publishedAt = new Date()`
5. Сохраняет изменения

---

#### deleteArticle

1. Проверяет существование статьи
2. Если есть `articleImage`, удаляет через `ImagesPort`
3. Удаляет статью из БД

**Важно:** Soft delete не используется, статья физически удаляется.

---

#### incrementView

Увеличивает счётчик просмотров на 1.

```typescript
await articleModel.findByIdAndUpdate(
  articleId,
  { $inc: { viewCount: 1 } }
);
```

**Использование:** Вызывается при каждом просмотре статьи клиентом.

---

#### getArticles (с пагинацией)

1. Строит MongoDB фильтр на основе `GetArticlesQuery.filters`
2. Применяет пагинацию через `mongoose-paginate-v2`
3. Сортирует по `createdAt: -1` (новые первые) по умолчанию
4. Возвращает `PaginateResult<Article>`:
   ```typescript
   {
     docs: Article[],
     totalDocs: number,
     limit: number,
     page: number,
     totalPages: number,
     hasNextPage: boolean,
     hasPrevPage: boolean
   }
   ```

---

## 8. Связи с другими модулями

### Infrastructure Dependencies

#### ImagesPort

**Связь:** Article → Images

**Использование:**
- Загрузка изображения статьи при создании/обновлении
- Удаление изображения при изменении/удалении статьи

**Методы:**
- `uploadImage()` - загрузка нового изображения
- `deleteImage()` - удаление старого изображения

**Конфигурация изображений:**
```typescript
{
  entityType: ImageEntityType.ARTICLE,
  entityId: articleId,
  imageType: ImageType.ARTICLE_IMAGE,
  accessLevel: ImageAccessLevel.PUBLIC
}
```

---

### Domain Dependencies

**Нет прямых зависимостей от других domain модулей.**

Article - самостоятельный модуль, не зависящий от Customer, Seller, Order и т.д.

---

### Consumers (кто использует Article)

#### Interface Layer

- **AdminArticlesRoleService** - CRUD статей для админов
- **PublicArticlesController** - публичное чтение статей

---

## 9. API Endpoints

### Admin API

**Базовый путь:** `/admin/articles`

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| POST | `/` | Создать статью | CreateArticleCommand |
| GET | `/` | Получить список статей | GetArticlesQuery |
| GET | `/:articleId` | Получить статью | GetArticleQuery |
| PATCH | `/:articleId` | Обновить статью | UpdateArticleCommand |
| PATCH | `/:articleId/status` | Изменить статус | ChangeArticleStatusCommand |
| DELETE | `/:articleId` | Удалить статью | deleteArticle() |

**Авторизация:** Требуется JWT токен с типом `admin`.

---

### Public API

**Базовый путь:** `/public/articles`

| Метод | Path | Описание | Query |
|-------|------|----------|-------|
| GET | `/` | Получить опубликованные статьи | GetArticlesQuery (только PUBLISHED) |
| GET | `/:articleId` | Получить статью + incrementView() | GetArticleQuery |

**Авторизация:** Не требуется (публичный доступ).

**Автоматические фильтры:**
- `status = PUBLISHED`
- `targetAudience` - в зависимости от роли пользователя (если авторизован) или `ALL`

---

## Примеры использования

### Создание статьи

```typescript
const command = new CreateArticleCommand({
  title: 'Как выбрать спелый авокадо',
  content: 'Подробное руководство по выбору идеального авокадо...',
  targetAudience: ArticleTargetAudience.ALL,
  tags: [ArticlesTag.TIPS, ArticlesTag.FRUITS, ArticlesTag.EXOTIC],
  articleImageFile: req.file // Multer file
});

const article = await articlePort.createArticle(command);
```

---

### Публикация черновика

```typescript
const command = new ChangeArticleStatusCommand(
  articleId,
  { status: ArticleStatus.PUBLISHED }
);

await articlePort.changeStatus(command);
```

---

### Получение статей для клиентов

```typescript
const query = new GetArticlesQuery({
  statuses: [ArticleStatus.PUBLISHED],
  targetAudience: ArticleTargetAudience.CUSTOMERS,
  tags: [ArticlesTag.HEALTH]
});

const result = await articlePort.getArticles(query, {
  pagination: { page: 1, pageSize: 10 }
});

console.log(result.docs); // Статьи
console.log(result.totalPages); // Всего страниц
```

---

## Заключение

**Article Module** - простой, но функциональный модуль для управления контентом платформы.

**Ключевые особенности:**
- ✅ Типобезопасные Commands/Queries
- ✅ Гибкая система фильтрации и таргетирования
- ✅ Интеграция с Images для медиа
- ✅ Пагинация из коробки
- ✅ Счётчик просмотров для аналитики

**Возможные улучшения (backlog):**
- [ ] Версионирование статей (history)
- [ ] Комментарии к статьям
- [ ] SEO метаданные (description, keywords)
- [ ] Мультиязычность (i18n)
- [ ] Авторы-продавцы (не только админы)
- [ ] Рекомендации статей на основе интересов
- [ ] Rich text editor metadata
- [ ] Scheduled publishing (отложенная публикация)

---

> **Примечание:** При изменении схемы, енумов или портов обязательно обновлять эту документацию.
