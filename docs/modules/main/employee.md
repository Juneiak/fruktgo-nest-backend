# Employee Module

> **Модуль:** `src/modules/employee`  
> **Назначение:** Управление сотрудниками магазинов (сборщики, курьеры, упаковщики)

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

**Employee Module** - управление сотрудниками магазинов. Сотрудники работают внутри конкретного магазина, выполняют операционные задачи (сборка, упаковка, доставка), открывают смены.

### Основные возможности

- ✅ Регистрация сотрудников через Telegram
- ✅ Привязка к продавцу (employer) и магазину (pinnedTo)
- ✅ Статусы работы (WORKING, RESTING, NOT_PINNED)
- ✅ Управление профилем (должность, зарплата, заметки)
- ✅ Блокировка/верификация сотрудников
- ✅ Статистика работы (заказы, смены, рейтинг)
- ✅ Отслеживание открытой смены
- ✅ Аватар сотрудника

### Бизнес-контекст

**Сценарий работы:**
1. Продавец создает сотрудника (или принимает заявку)
2. Сотрудник привязывается к продавцу (`employer`)
3. Продавец прикрепляет сотрудника к магазину (`pinnedTo`)
4. Сотрудник открывает смену и работает
5. Статус меняется: NOT_PINNED → WORKING ↔ RESTING

---

## 2. Схема данных

### Employee Schema

**Файл:** `employee.schema.ts`

```typescript
class Employee {
  _id: Types.ObjectId;
  employeeId: string;  // Виртуальное поле
  
  // Telegram данные
  telegramId: number;              // Уникальный ID (unique)
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  
  // Контакты
  phone: string;                   // Уникальный телефон (unique)
  
  // Профиль
  employeeName: string;            // Имя сотрудника (required)
  sex: UserSex;                    // Пол (default: NOT_SPECIFIED)
  birthDate?: Date;                // Дата рождения
  employeeAvatar?: Types.ObjectId; // Аватар (Image)
  
  // Должность и условия
  position?: string;               // Должность
  salary?: string;                 // Зарплата (строка, т.к. может быть "от X до Y")
  
  // Статусы
  blocked: Blocked;                // Блокировка
  verifiedStatus: VerifiedStatus;  // Верификация (default: IS_CHECKING)
  status: EmployeeStatus;          // Статус работы (default: NOT_PINNED)
  
  // Связи
  employer: Types.ObjectId | null;    // Работодатель (Seller)
  pinnedTo: Types.ObjectId | null;    // Прикреплен к магазину (Shop)
  openedShift: Types.ObjectId | null; // Открытая смена (Shift)
  
  // Заметки
  sellerNote?: string;             // Заметка продавца
  internalNote?: string;           // Внутренняя заметка админа
  
  // Активность
  lastLoginAt?: Date;              // Последний вход
  
  // Статистика
  statistics: EmployeeStatistics;
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}
```

### EmployeeStatistics

```typescript
interface EmployeeStatistics {
  totalOrders: number;       // Всего обработано заказов
  totalShifts: number;       // Всего смен
  shiftRating: number;       // Рейтинг работы (0-100)
}
```

### Индексы

Уникальные:
- `telegramId` - unique
- `phone` - unique

### Плагины

- **mongooseLeanVirtuals**
- **mongoosePaginate**

---

## 3. Енумы

### EmployeeStatus

Статус работы сотрудника.

```typescript
enum EmployeeStatus {
  WORKING = 'working',       // Работает (смена открыта)
  RESTING = 'resting',       // Отдыхает (смена на паузе)
  NOT_PINNED = 'notPinned'   // Не прикреплен к магазину
}
```

**Логика:**
- `NOT_PINNED` - сотрудник создан, но еще не назначен на магазин
- `WORKING` - активно работает (есть открытая смена)
- `RESTING` - смена на паузе или закрыта

---

## 4. Commands (Write операции)

### UpdateEmployeeCommand

Обновление данных сотрудника.

```typescript
class UpdateEmployeeCommand {
  constructor(
    public readonly employeeId: string,
    public readonly payload: {
      verifiedStatus?: VerifiedStatus;
      internalNote?: string | null;
      position?: string | null;
      salary?: string | null;
      sellerNote?: string | null;
      status?: EmployeeStatus;
    }
  )
}
```

**Бизнес-логика:**
- Обновляются только переданные поля
- `sellerNote` может изменить только продавец
- `internalNote` только админ
- `status` меняется при открытии/закрытии смены

---

### BlockEmployeeCommand

Блокировка сотрудника.

```typescript
class BlockEmployeeCommand {
  constructor(
    public readonly employeeId: string,
    public readonly payload: BlockPayload
  )
}
```

**Бизнес-логика:**
- При блокировке автоматически закрывается открытая смена (если есть)
- Заполняет `blocked.reason`, `blocked.code`, `blocked.by`

---

## 5. Queries (Read операции)

### GetEmployeeQuery

Получить одного сотрудника.

```typescript
class GetEmployeeQuery {
  constructor(
    public readonly filter: AtLeastOne<{
      employeeId: string;
      telegramId: number;
      phone: string;
    }>,
    public readonly options?: {
      select?: (keyof Employee)[]
    }
  )
}
```

**Особенность:** Хотя бы один из фильтров обязателен (AtLeastOne).

---

### GetEmployeesQuery

Получить список сотрудников.

```typescript
class GetEmployeesQuery {
  constructor(
    public readonly filters?: {
      verifiedStatuses?: VerifiedStatus[];
      blockedStatuses?: BlockStatus[];
      sexes?: UserSex[];
      statuses?: EmployeeStatus[];
      sellerId?: string;      // Сотрудники конкретного продавца
      shopId?: string;        // Сотрудники конкретного магазина
    },
    public readonly options?: {
      select?: (keyof Employee)[]
    }
  )
}
```

**Примеры:**
```typescript
// Все работающие сотрудники магазина
new GetEmployeesQuery({
  shopId: '507f...',
  statuses: [EmployeeStatus.WORKING]
})

// Сотрудники продавца
new GetEmployeesQuery({
  sellerId: '507f...'
})
```

---

## 6. Port (Интерфейс)

**Файл:** `employee.port.ts`

```typescript
interface EmployeePort {
  // QUERIES
  getEmployees(
    query: GetEmployeesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Employee>>;
  
  getEmployee(
    query: GetEmployeeQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Employee | null>;

  // COMMANDS
  updateEmployee(
    command: UpdateEmployeeCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  blockEmployee(
    command: BlockEmployeeCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
}

export const EMPLOYEE_PORT = Symbol('EMPLOYEE_PORT');
```

**Примечание:** Нет `createEmployee` - создание происходит через другие процессы (Job Application, Seller создает).

---

## 7. Связи с другими модулями

### Domain Dependencies

#### ShopPort

**Связь:** Employee → Shop (через `pinnedTo`)

**Использование:**
- Сотрудник прикреплен к конкретному магазину
- При открытии смены проверяется `pinnedTo`

#### SellerPort

**Связь:** Employee → Seller (через `employer`)

**Использование:**
- Работодатель сотрудника
- Устанавливается при принятии Job Application

#### ShiftPort

**Связь:** Employee ↔ Shift (через `openedShift`)

**Использование:**
- Отслеживание активной смены сотрудника
- При открытии смены: `employee.openedShift = shiftId`
- При закрытии смены: `employee.openedShift = null`

---

### Infrastructure Dependencies

#### ImagesPort

**Связь:** Employee → Images (через `employeeAvatar`)

**Использование:**
- Загрузка аватара сотрудника

---

### Consumers

#### Interface Layer

- **EmployeeMeRoleService** - профиль сотрудника (`/employee/me`)
- **SellerEmployeesRoleService** - управление сотрудниками (`/seller/employees`)
- **AdminEmployeesRoleService** - админ панель (`/admin/employees`)

#### Domain Modules

- **JobApplicationService** - найм сотрудников
- **ShiftService** - открытие/закрытие смен
- **OrderService** - назначение задач сотрудникам

---

## 8. API Endpoints

### Employee API (`/employee/me`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Получить профиль | GetEmployeeQuery |
| PATCH | `/avatar` | Загрузить аватар | uploadImage() |

**Авторизация:** JWT токен с типом `employee`.

---

### Seller API (`/seller/employees`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Список сотрудников | GetEmployeesQuery |
| GET | `/:employeeId` | Детали сотрудника | GetEmployeeQuery |
| PATCH | `/:employeeId` | Обновить сотрудника | UpdateEmployeeCommand |
| PATCH | `/:employeeId/pin` | Прикрепить к магазину | pinEmployeeToShop() |
| PATCH | `/:employeeId/unpin` | Открепить от магазина | unpinEmployee() |

**Авторизация:** JWT токен с типом `seller`.

---

### Admin API (`/admin/employees`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Список всех сотрудников | GetEmployeesQuery |
| GET | `/:employeeId` | Детали сотрудника | GetEmployeeQuery |
| PATCH | `/:employeeId` | Обновить сотрудника | UpdateEmployeeCommand |
| PATCH | `/:employeeId/block` | Заблокировать | BlockEmployeeCommand |

**Авторизация:** JWT токен с типом `admin`.

---

## Примеры использования

### Обновление должности и зарплаты

```typescript
const command = new UpdateEmployeeCommand(
  employeeId,
  {
    position: 'Старший курьер',
    salary: '50000-70000',
    sellerNote: 'Отличный сотрудник, пунктуальный'
  }
);

await employeePort.updateEmployee(command);
```

---

### Получение работающих сотрудников магазина

```typescript
const query = new GetEmployeesQuery({
  shopId: '507f...',
  statuses: [EmployeeStatus.WORKING],
  blockedStatuses: [BlockStatus.ACTIVE]
});

const result = await employeePort.getEmployees(query);
console.log(result.docs); // Список активных сотрудников
```

---

### Блокировка сотрудника

```typescript
const command = new BlockEmployeeCommand(
  employeeId,
  {
    status: BlockStatus.BLOCKED,
    reason: 'Систематические опоздания',
    code: 'ATTENDANCE_VIOLATION'
  }
);

await employeePort.blockEmployee(command);
// Если была открыта смена - автоматически закроется
```

---

## Заключение

**Employee Module** - ключевой модуль для операционной работы магазинов.

**Ключевые особенности:**
- ✅ Привязка к продавцу и магазину
- ✅ Отслеживание активной смены
- ✅ Статистика работы
- ✅ Гибкая система статусов
- ✅ Связь с Shift, Shop, Seller модулями

**Связанные модули:**
- **Shift** - управление сменами
- **Shop** - магазины
- **Seller** - работодатели
- **JobApplication** - найм

**Возможные улучшения (backlog):**
- [ ] Система ролей внутри магазина (курьер, сборщик, менеджер)
- [ ] График работы и расписание
- [ ] KPI и система бонусов
- [ ] История смен с детализацией
- [ ] Сертификаты и обучение

---

> **Примечание:** При изменении схемы или портов обновлять эту документацию.
