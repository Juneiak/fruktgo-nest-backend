# Issue Module

> **Модуль:** `src/modules/issue`  
> **Назначение:** Система обращений в поддержку от пользователей платформы

---

## Содержание

- [1. Обзор](#1-обзор)
- [2. Схема данных](#2-схема-данных)
- [3. Енумы](#3-енумы)
- [4. Commands](#4-commands-write-операции)
- [5. Queries](#5-queries-read-операции)
- [6. Port](#6-port-интерфейс)
- [7. Связи с модулями](#7-связи-с-другими-модулями)
- [8. API Endpoints](#8-api-endpoints)

---

## 1. Обзор

**Issue Module** - система обращений в поддержку. Позволяет клиентам, продавцам и сотрудникам создавать тикеты с проблемами, которые обрабатываются администраторами платформы.

### Основные возможности

- ✅ Создание обращений от любого типа пользователя (Customer, Seller, Employee)
- ✅ Динамические ссылки (refPath) на создателя обращения
- ✅ Категоризация проблем (техническая, оплата, доставка, возврат и т.д.)
- ✅ Уровни приоритета (LOW, MEDIUM, HIGH)
- ✅ Статусы обработки (NEW, IN_PROGRESS, CLOSED)
- ✅ Разрешение проблемы с текстом и датой
- ✅ Фильтрация по категориям, статусам, приоритетам

### Бизнес-контекст

**Сценарии использования:**
- **Клиент** создает обращение по проблеме с заказом/доставкой
- **Продавец** создает обращение по техническим проблемам
- **Сотрудник** создает обращение по проблемам в работе
- **Админ** обрабатывает все обращения, устанавливает приоритеты, закрывает с резолюцией

---

## 2. Схема данных

### Issue Schema

**Файл:** `issue.schema.ts`

```typescript
class Issue {
  _id: Types.ObjectId;
  issueId: string;  // Виртуальное поле
  
  // Кто создал обращение
  fromUserType: IssueUserType;     // 'Customer' | 'Seller' | 'Employee'
  fromTelegramId: number;          // Telegram ID создателя
  from: Types.ObjectId;            // Динамическая ссылка (refPath)
  
  // Содержание
  issueText: string;               // Текст обращения (10-5000 символов)
  
  // Классификация
  status: IssueStatus;             // NEW, IN_PROGRESS, CLOSED (default: NEW)
  level: IssueLevel;               // LOW, MEDIUM, HIGH (optional)
  category?: IssueCategory | null; // Категория проблемы (optional)
  
  // Разрешение
  resolution: string | null;       // Текст разрешения (как решили)
  resolvedAt: Date | null;         // Когда закрыто
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}
```

### Динамическая ссылка (refPath)

```typescript
@Prop({
  type: Types.ObjectId,
  required: true,
  refPath: 'fromUserType'  // <-- Ссылается на Customer/Seller/Employee в зависимости от типа
})
from: Types.ObjectId;
```

**Как работает:**
- Если `fromUserType = 'Customer'`, то `from` ссылается на `Customer`
- Если `fromUserType = 'Seller'`, то `from` ссылается на `Seller`
- Если `fromUserType = 'Employee'`, то `from` ссылается на `Employee`

### Плагины

- **mongooseLeanVirtuals** - виртуальные поля
- **mongoosePaginate** - пагинация

---

## 3. Енумы

### IssueStatus

Статус обработки обращения.

```typescript
enum IssueStatus {
  NEW = 'new',                 // Новое обращение
  IN_PROGRESS = 'inProgress',  // В работе
  CLOSED = 'closed'            // Закрыто
}
```

**Жизненный цикл:**
```
NEW → IN_PROGRESS → CLOSED
```

---

### IssueUserType

Тип пользователя, создавшего обращение.

```typescript
enum IssueUserType {
  CUSTOMER = 'Customer',   // Клиент
  SELLER = 'Seller',       // Продавец
  EMPLOYEE = 'Employee'    // Сотрудник
}
```

**Важно:** Значения соответствуют именам моделей MongoDB для работы `refPath`.

---

### IssueLevel

Уровень приоритета обращения.

```typescript
enum IssueLevel {
  LOW = 'low',       // Низкий приоритет
  MEDIUM = 'medium', // Средний приоритет
  HIGH = 'high'      // Высокий приоритет
}
```

**Устанавливается:** Администратором при обработке.

---

### IssueCategory

Категория проблемы.

```typescript
enum IssueCategory {
  TECHNICAL = 'technical',         // Технические проблемы (баги, недоступность)
  PAYMENT = 'payment',             // Проблемы с оплатой
  DELIVERY = 'delivery',           // Проблемы с доставкой
  PRODUCT = 'product',             // Проблемы с товаром (качество, недовес)
  ACCOUNT = 'account',             // Проблемы с аккаунтом
  REFUND = 'refund',               // Возврат средств
  FEATURE_REQUEST = 'feature',     // Запрос функционала
  OTHER = 'other'                  // Прочее
}
```

**Использование:**
- Помогает в статистике и приоритизации
- Админы могут фильтровать по категориям
- Может быть `null` (категория не определена)

---

## 4. Commands (Write операции)

### CreateIssueCommand

Создание нового обращения.

```typescript
class CreateIssueCommand {
  constructor(
    public readonly payload: {
      fromUserType: IssueUserType;  // Тип создателя
      from: string;                 // ID создателя
      fromTelegramId: number;       // Telegram ID
      issueText: string;            // Текст обращения
    }
  )
}
```

**Бизнес-логика:**
- Валидирует длину текста (10-5000 символов)
- Устанавливает `status = NEW`
- Сохраняет ссылку на создателя через `refPath`

---

### UpdateIssueCommand

Обновление обращения (админ).

```typescript
class UpdateIssueCommand {
  constructor(
    public readonly issueId: string,
    public readonly payload: {
      status?: IssueStatus;
      level?: IssueLevel;
      category?: IssueCategory | null;
      resolution?: string | null;
    }
  )
}
```

**Бизнес-логика:**
- Обновляются только переданные поля
- При закрытии (`status = CLOSED`):
  - Требуется `resolution`
  - Устанавливается `resolvedAt = new Date()`
- Админ может изменить приоритет и категорию

---

## 5. Queries (Read операции)

### GetIssueQuery

Получить одно обращение.

```typescript
class GetIssueQuery {
  constructor(
    public readonly issueId: string,
    public readonly options?: {
      select?: (keyof Issue)[]
    }
  )
}
```

---

### GetIssuesQuery

Получить список обращений с фильтрами.

```typescript
class GetIssuesQuery {
  constructor(
    public readonly filters?: {
      statuses?: IssueStatus[];
      levels?: IssueLevel[];
      categories?: IssueCategory[];
      fromUserType?: IssueUserType;
      from?: string;  // ID конкретного пользователя
      fromDate?: Date;
      toDate?: Date;
    },
    public readonly options?: {
      select?: (keyof Issue)[]
    }
  )
}
```

**Использование:**
```typescript
// Все новые обращения высокого приоритета
new GetIssuesQuery({
  statuses: [IssueStatus.NEW],
  levels: [IssueLevel.HIGH]
})

// Обращения конкретного клиента
new GetIssuesQuery({
  fromUserType: IssueUserType.CUSTOMER,
  from: customerId
})

// Проблемы с доставкой за последнюю неделю
new GetIssuesQuery({
  categories: [IssueCategory.DELIVERY],
  fromDate: new Date('2024-11-15')
})
```

---

## 6. Port (Интерфейс)

**Файл:** `issue.port.ts`

```typescript
interface IssuePort {
  // QUERIES
  getIssues(
    query: GetIssuesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Issue>>;
  
  getIssue(
    query: GetIssueQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Issue | null>;

  // COMMANDS
  createIssue(
    command: CreateIssueCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Issue>;
  
  updateIssue(
    command: UpdateIssueCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
}

export const ISSUE_PORT = Symbol('ISSUE_PORT');
```

---

## 7. Связи с другими модулями

### Consumers

#### Interface Layer

- **AdminIssuesRoleService** - управление всеми обращениями (`/admin/issues`)
- **CustomerIssuesRoleService** - создание обращений клиентами (`/customer/issues`)
- **SellerIssuesRoleService** - создание обращений продавцами (`/seller/issues`)
- **EmployeeIssuesRoleService** - создание обращений сотрудниками (`/employee/issues`)

#### Domain Modules

Не зависит от других domain модулей напрямую (использует только общие типы).

---

## 8. API Endpoints

### Customer API (`/customer/issues`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| POST | `/` | Создать обращение | CreateIssueCommand |
| GET | `/` | Мои обращения | GetIssuesQuery (filter by customerId) |
| GET | `/:issueId` | Детали обращения | GetIssueQuery |

**Авторизация:** JWT токен с типом `customer`.

---

### Seller API (`/seller/issues`)

Аналогично Customer API.

---

### Employee API (`/employee/issues`)

Аналогично Customer API.

---

### Admin API (`/admin/issues`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Все обращения с фильтрами | GetIssuesQuery |
| GET | `/:issueId` | Детали обращения | GetIssueQuery |
| PATCH | `/:issueId` | Обновить обращение | UpdateIssueCommand |
| PATCH | `/:issueId/status` | Изменить статус | UpdateIssueCommand |

**Авторизация:** JWT токен с типом `admin`.

---

## Примеры использования

### Создание обращения клиентом

```typescript
const command = new CreateIssueCommand({
  fromUserType: IssueUserType.CUSTOMER,
  from: customerId,
  fromTelegramId: 123456789,
  issueText: 'Заказ #12345 доставлен с опозданием на 2 часа. Товары были повреждены.'
});

const issue = await issuePort.createIssue(command);
console.log(issue.status); // "new"
```

---

### Обработка обращения админом

```typescript
// Установка приоритета и категории
const command = new UpdateIssueCommand(
  issueId,
  {
    level: IssueLevel.HIGH,
    category: IssueCategory.DELIVERY,
    status: IssueStatus.IN_PROGRESS
  }
);

await issuePort.updateIssue(command);
```

---

### Закрытие обращения с резолюцией

```typescript
const command = new UpdateIssueCommand(
  issueId,
  {
    status: IssueStatus.CLOSED,
    resolution: 'Клиенту возвращены средства. Магазин получил предупреждение.'
  }
);

await issuePort.updateIssue(command);
// resolvedAt автоматически устанавливается
```

---

### Получение обращений по категории

```typescript
const query = new GetIssuesQuery({
  statuses: [IssueStatus.NEW, IssueStatus.IN_PROGRESS],
  categories: [IssueCategory.PAYMENT, IssueCategory.REFUND]
});

const result = await issuePort.getIssues(query, {
  pagination: { page: 1, pageSize: 20 },
  sort: { createdAt: -1 }
});
```

---

## Заключение

**Issue Module** - критичный модуль для поддержки пользователей.

**Ключевые особенности:**
- ✅ Динамические ссылки через `refPath` (универсальность)
- ✅ Гибкая система категоризации и приоритизации
- ✅ Поддержка всех типов пользователей
- ✅ Отслеживание жизненного цикла обращения
- ✅ Разрешение с датой закрытия

**Возможные улучшения (backlog):**
- [ ] Система сообщений (переписка в обращении)
- [ ] Прикрепление файлов (скриншоты проблем)
- [ ] Эскалация обращений
- [ ] SLA (время ответа/решения)
- [ ] Связь с Order (автозаполнение при проблеме с заказом)
- [ ] Рейтинг качества поддержки

---

> **Примечание:** При изменении схемы или портов обновлять эту документацию.
