# Article Module - Краткое руководство

## 📋 Обзор

Модуль для управления статьями блога. Поддерживает создание, обновление, публикацию и архивирование статей с различными целевыми аудиториями.

---

## 🏗️ Архитектура

### Основные компоненты:

```
article/
├── article.schema.ts       - Mongoose схема
├── article.service.ts      - Доменный сервис (чистая логика)
├── article.facade.ts       - Фасад для внешних модулей
├── article.port.ts         - Интерфейс для взаимодействия
├── article.module.ts       - NestJS модуль
├── article.commands.ts     - Команды изменения состояния
├── article.queries.ts      - Запросы для чтения данных
├── article.enums.ts        - Перечисления и константы
```

---

## 📦 Основные файлы

### 1. **article.schema.ts** - Схема данных

```typescript
Article {
  title: string                   // Заголовок
  content: string                 // Контент (полный текст)
  contentPreview: string          // Превью (200 символов)
  tags: ArtcilesTag[]             // Теги статьи
  status: ArticleStatus           // Статус (PUBLISHED, ARCHIVED)
  targetAudience: ArticleTargetAudience  // Целевая аудитория
  authorType: ArticleAuthorType   // Тип автора (ADMIN)
  author?: ObjectId               // ID автора
  articleImage?: ObjectId         // Изображение статьи
  viewCount: number               // Счетчик просмотров
  publishedAt?: Date              // Дата публикации
}
```

---

### 2. **article.service.ts** - Доменный сервис

Чистый сервис без внешних зависимостей (кроме ArticleModel).

#### **Queries (чтение)**:
- `getArticle()` - получить одну статью по ID
- `getArticles()` - список с фильтрами (статус, аудитория, теги, даты)
- `getPublishedArticles()` - только опубликованные статьи для публики

#### **Commands (изменение)**:
- `createArticle()` - создать статью (по умолчанию в статусе DRAFT)
- `updateArticle()` - обновить статью
- `changeStatus()` - изменить статус (DRAFT → PUBLISHED → HIDDEN → ARCHIVED)
- `deleteArticle(articleId)` - удалить статью
- `incrementView(articleId)` - увеличить счетчик просмотров

---

### 3. **article.commands.ts** - Команды

```typescript
// Создание
CreateArticleCommand(
  title: string,
  content: string,
  targetAudience: ArticleTargetAudience,
  tags: ArtcilesTag[],
  articleImageId?: string
)

// Обновление
UpdateArticleCommand(
  articleId: string,
  title?: string,
  content?: string,
  targetAudience?: ArticleTargetAudience,
  tags?: ArtcilesTag[],
  status?: ArticleStatus,
  articleImageId?: string
)

// Изменение статуса
ChangeArticleStatusCommand(
  articleId: string,
  status: ArticleStatus
)

// Удаление - принимает просто строку
deleteArticle(articleId: string)

// Увеличение просмотров - принимает просто строку
incrementView(articleId: string)
```

---

### 4. **article.enums.ts** - Перечисления

#### **ArticleStatus** - Статус статьи:
```typescript
DRAFT = 'draft'           // Черновик
PUBLISHED = 'published'   // Опубликована
HIDDEN = 'hidden'         // Скрыта
ARCHIVED = 'archived'     // Архивирована
```

#### **ArticleTargetAudience** - Целевая аудитория:
```typescript
ALL = 'all'                      // Для всех
SELLERS = UserType.SELLER        // Для продавцов
EMPLOYEES = UserType.EMPLOYEE    // Для сотрудников
CUSTOMERS = UserType.CUSTOMER    // Для клиентов
```

#### **ArticleAuthorType** - Тип автора:
```typescript
ADMIN = UserType.ADMIN   // Админ системы
```

#### **ArtcilesTag** - Теги статей:
```typescript
DELIVERY = 'delivery'         // О доставке
PAYMENT = 'payment'           // Об оплате
FRUITS = 'fruits'             // О фруктах
VEGETABLES = 'vegetables'     // Об овощах
EXOTIC = 'exotic'             // Экзотические продукты
// ... и другие
```

---

### 5. **article.queries.ts** - Запросы

```typescript
// Получить одну статью
GetArticleQuery(articleId: string)

// Получить список с фильтрами
GetArticlesQuery({
  status?: ArticleStatus;
  authorType?: ArticleAuthorType;
  targetAudience?: ArticleTargetAudience;
  tags?: ArtcilesTag[];
  fromDate?: Date;
  toDate?: Date;
})

// Получить опубликованные (для публики)
GetPublishedArticlesQuery({
  targetAudience?: ArticleTargetAudience;
  tags?: ArtcilesTag[];
})
```

---

### 6. **article.facade.ts** - Фасад

Упрощает взаимодействие с модулем. Реализует интерфейс `ArticlePort`.

---

### 7. **article.port.ts** - Интерфейс

Определяет контракт для внешних модулей.

---

## 🔧 Как использовать

### В других модулях:

```typescript
@Module({
  imports: [ArticleModule],
})
export class SomeModule {}

// В сервисе
constructor(
  @Inject(ARTICLE_PORT) private readonly articlePort: ArticlePort
) {}

// Создание статьи
const article = await this.articlePort.createArticle(
  new CreateArticleCommand(
    'Как выбрать свежие фрукты',
    'Полный текст статьи...',
    ArticleTargetAudience.CUSTOMERS,
    [ArtcilesTag.FRUITS, ArtcilesTag.DELIVERY],
    'image_id_123'
  )
);

// Получение опубликованных статей
const articles = await this.articlePort.getPublishedArticles(
  new GetPublishedArticlesQuery({
    targetAudience: ArticleTargetAudience.CUSTOMERS,
    tags: [ArtcilesTag.FRUITS]
  })
);
```

---

## 🔄 Жизненный цикл статьи

```
DRAFT → PUBLISHED → HIDDEN → ARCHIVED
  ↓         ↓         ↓         ↓
Создание  Опубликована  Скрыта  Архивирована
           (появляется   (не показывается)
            в публике)
```

### Переходы между статусами:
- **DRAFT** → **PUBLISHED** - публикация (устанавливается `publishedAt`)
- **PUBLISHED** → **HIDDEN** - скрыть от публики (временно)
- **HIDDEN** → **PUBLISHED** - вернуть в публику
- **PUBLISHED/HIDDEN** → **ARCHIVED** - архивировать (долгосрочное хранение)
- **Любой статус** → **deleteArticle()** - физическое удаление

---

## 🎯 Принципы работы

### 1. **Доменная чистота**
`ArticleService` не зависит от других модулей. Только работа с ArticleModel.

### 2. **Автоматический contentPreview**
При создании/обновлении статьи автоматически создается превью (первые 200 символов).

### 3. **Автоматическая publishedAt**
При первой публикации автоматически устанавливается дата `publishedAt`.

### 4. **Счетчик просмотров**
Метод `incrementView()` увеличивает счетчик без загрузки всей статьи (оптимизация).

### 5. **Фильтрация для публики**
`getPublishedArticles()` возвращает только статьи со статусом `PUBLISHED`.

---

## 📝 Примеры использования

### 1. Создание статьи (черновик):
```typescript
const article = await articleService.createArticle(
  new CreateArticleCommand(
    'Польза экзотических фруктов',
    'Экзотические фрукты содержат множество витаминов...',
    ArticleTargetAudience.ALL,
    [ArtcilesTag.FRUITS, ArtcilesTag.EXOTIC],
    'uploaded_image_id'
  )
);
// Статус по умолчанию: DRAFT
```

### 2. Публикация статьи:
```typescript
await articleService.changeStatus(
  new ChangeArticleStatusCommand('article_123', ArticleStatus.PUBLISHED)
);
// Автоматически устанавливается publishedAt
```

### 3. Скрытие статьи:
```typescript
await articleService.changeStatus(
  new ChangeArticleStatusCommand('article_123', ArticleStatus.HIDDEN)
);
// Статья скрыта, но не удалена
```

### 4. Архивирование:
```typescript
await articleService.changeStatus(
  new ChangeArticleStatusCommand('article_123', ArticleStatus.ARCHIVED)
);
```

### 5. Обновление статьи:
```typescript
await articleService.updateArticle(
  new UpdateArticleCommand(
    'article_123',
    'Обновленный заголовок',
    'Обновленный контент...',
    ArticleTargetAudience.CUSTOMERS,
    [ArtcilesTag.FRUITS],
    ArticleStatus.PUBLISHED,
    'new_image_id'
  )
);
```

### 6. Получение опубликованных статей:
```typescript
const articles = await articleService.getPublishedArticles(
  new GetPublishedArticlesQuery({
    targetAudience: ArticleTargetAudience.CUSTOMERS
  })
);
```

### 7. Удаление статьи:
```typescript
await articleService.deleteArticle('article_123');
// Физическое удаление из БД
```

### 8. Увеличение просмотров:
```typescript
await articleService.incrementView('article_123');
// Оптимизированный $inc без загрузки документа
```

---

## ⚠️ Важные замечания

1. **Работа с изображениями** - `articleImageId` передается уже загруженным. Загрузку изображений выполняет оркестратор через `ImagesPort`.

2. **ContentPreview автоматический** - не нужно передавать вручную, генерируется из `content`.

3. **AuthorType всегда ADMIN** - в текущей версии только админы могут создавать статьи.

4. **Целевая аудитория** - используется для фильтрации статей в приложении (клиенты видят только свои).

5. **Статусы статьи** - жизненный цикл: `DRAFT` (создание) → `PUBLISHED` (публикация) → `HIDDEN` (скрыта) → `ARCHIVED` (архив). Удаление (`deleteArticle`) - физическое удаление из БД.

6. **Упрощенные методы** - методы `deleteArticle()` и `incrementView()` принимают просто `articleId: string` без создания команды.

---

## 🚀 Следующие шаги

1. Создать **оркестратор** для загрузки изображений при создании статьи
2. Добавить **пагинацию** для списка статей
3. Реализовать **поиск** по статьям (полнотекстовый)
4. Добавить **комментарии** к статьям
5. Реализовать **рекомендации** статей на основе предпочтений пользователя

---

## 📚 Связанные модули

- **Images Module** - загрузка изображений для статей
- **Customer Module** - фильтрация по целевой аудитории
- **Employee Module** - авторство статей от сотрудников (будущее)
