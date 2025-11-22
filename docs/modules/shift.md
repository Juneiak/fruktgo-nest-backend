# Shift Module

> **Модуль:** `src/modules/shift`  
> **Назначение:** Управление сменами магазинов с системой событий и статистикой

---

## Содержание

- [1. Обзор](#1-обзор)
- [2. Схема данных](#2-схема-данных)
- [3. Енумы](#3-енумы)
- [4. State Machine](#4-state-machine-машина-состояний)
- [5. Commands](#5-commands-write-операции)
- [6. Queries](#6-queries-read-операции)
- [7. Port](#7-port-интерфейс)
- [8. Связи с модулями](#8-связи-с-другими-модулями)
- [9. API Endpoints](#9-api-endpoints)

---

## 1. Обзор

**Shift Module** - сложный модуль для управления сменами работы магазинов. Использует **Event Sourcing** паттерн и **State Machine** для отслеживания жизненного цикла смены.

### Основные возможности

- ✅ Открытие/закрытие смен с валидацией переходов
- ✅ State Machine (OPEN → PAUSED → CLOSING → CLOSED/ABANDONED)
- ✅ Журнал всех событий смены (Event Log)
- ✅ Снэпшот SLA на момент открытия
- ✅ Агрегированная статистика по заказам
- ✅ Actor-based tracking (кто и когда совершил действие)
- ✅ Уникальная активная смена на магазин
- ✅ Комментарии к действиям

### Бизнес-контекст

**Сценарий работы:**
1. Сотрудник открывает смену → статус `OPEN`, создается событие `OPEN`
2. Сотрудник может поставить смену на паузу → `PAUSED`
3. Сотрудник возобновляет смену → обратно в `OPEN`
4. Сотрудник начинает закрытие → `CLOSING`
5. Завершается закрытие → `CLOSED` (финальный статус)
6. Админ может принудительно закрыть → `FORCE_CLOSE`

**Важно:** На один магазин может быть **только одна** активная смена (OPEN/CLOSING).

---

## 2. Схема данных

### Shift Schema

**Файл:** `shift.schema.ts`

```typescript
class Shift {
  _id: Types.ObjectId;
  shiftId: string;  // Виртуальное поле
  
  // Основное
  shop: Types.ObjectId;        // Магазин (required)
  status: ShiftStatus;         // Статус смены (default: OPEN)
  
  // SLA-снэпшот (на момент открытия)
  sla: SlaSnapshot;            // Зафиксированные параметры
  
  // Статистика
  statistics: Statistics;      // Агрегаты по заказам
  
  // Кто открыл
  openedBy: Actor;             // Актор (Employee/Seller/Admin)
  openedAt: Date;              // Когда открыта
  
  // Кто закрыл
  closedBy: Actor | null;      // Актор закрытия
  closedAt: Date | null;       // Когда закрыта
  
  // Журнал событий (Event Log)
  events: ShiftEvent[];        // Все события смены
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Actor (Embedded)

Кто совершил действие.

```typescript
interface Actor {
  actorType: ActorType;     // Employee | Seller | Admin
  actorId: Types.ObjectId;  // ID актора
  actorName: string;        // Имя актора
}
```

**Использование:** Каждое действие со сменой записывает, кто его совершил.

---

### SlaSnapshot (Embedded)

Снэпшот SLA на момент открытия смены.

```typescript
interface SlaSnapshot {
  acceptanceTimeLimit: number;  // Лимит принятия заказа (секунды)
  assemblyTimeLimit: number;    // Лимит сборки заказа (секунды)
  minOrderSum: number;          // Минимальная сумма заказа
  openAt: Date;                 // Время открытия магазина
  closedAt: Date;               // Время закрытия магазина
}
```

**Зачем:** Если SLA магазина изменится, смена сохранит параметры на момент открытия для корректной аналитики.

---

### Statistics (Embedded)

Агрегированная статистика по смене.

```typescript
interface Statistics {
  ordersCount: number;                 // Всего заказов
  deliveredOrdersCount: number;        // Доставлено
  canceledOrdersCount: number;         // Отменено
  declinedOrdersCount: number;         // Отклонено магазином
  totalIncome: number;                 // Общий доход
  declinedIncome: number;              // Упущенный доход
  avgOrderPrice: number;               // Средний чек
  avgOrderAcceptanceDuration: number;  // Среднее время принятия (сек)
  avgOrderAssemblyDuration: number;    // Среднее время сборки (сек)
}
```

**Обновление:** Пересчитывается при каждом изменении заказа через `UpdateStatisticsCommand`.

---

### ShiftEvent (Embedded)

Событие в журнале смены.

```typescript
interface ShiftEvent {
  type: ShiftEventType;         // OPEN, PAUSE, RESUME, etc.
  at: Date;                     // Когда произошло
  by: Actor;                    // Кто совершил
  comment?: string | null;      // Комментарий
  payload?: Record<string, unknown>;  // Дополнительные данные
}
```

**Event Log:** Все действия со сменой записываются в массив `events` для аудита.

---

### Индексы

```typescript
ShiftSchema.index(
  { shop: 1 },
  {
    unique: true,
    partialFilterExpression: { 
      status: { $in: [ShiftStatus.OPEN, ShiftStatus.CLOSING] } 
    },
    name: 'uniq_open_or_closing_per_shop'
  }
);
```

**Гарантия:** Не более одной активной смены (OPEN/CLOSING) на магазин.

---

## 3. Енумы

### ShiftStatus

Статус смены.

```typescript
enum ShiftStatus {
  OPEN = 'open',           // Смена открыта и активна
  PAUSED = 'paused',       // Смена на паузе
  CLOSING = 'closing',     // Смена в процессе закрытия
  CLOSED = 'closed',       // Смена закрыта (финальный)
  ABANDONED = 'abandoned'  // Смена прервана (финальный)
}
```

---

### ShiftEventType

Типы событий смены.

```typescript
enum ShiftEventType {
  OPEN = 'open',                  // Открытие смены
  PAUSE = 'pause',                // Пауза
  RESUME = 'resume',              // Возобновление
  START_CLOSING = 'start_closing', // Начало закрытия
  CLOSE = 'close',                // Закрытие
  FORCE_CLOSE = 'force_close',    // Принудительное закрытие
  ABANDON = 'abandon'             // Прерывание
}
```

---

### ActorType

Тип актора (кто совершает действия).

```typescript
enum ActorType {
  EMPLOYEE = 'Employee',  // Сотрудник
  SELLER = 'Seller',      // Продавец
  ADMIN = 'Admin'         // Админ
}
```

---

## 4. State Machine (Машина состояний)

### Диаграмма переходов

```
              ┌──────────────────────────┐
              │      OPEN (открыта)      │
              └──────────────────────────┘
                 │    │    │         │
    ┌────────────┘    │    └─────────┼──────────┐
    │                 │              │          │
    ▼                 ▼              ▼          ▼
┌────────┐      ┌──────────┐   ┌─────────┐  ┌───────────┐
│ PAUSED │◄─────┤ CLOSING  │   │ CLOSED  │  │ ABANDONED │
└────────┘      └──────────┘   └─────────┘  └───────────┘
    │                 │              ▲          ▲
    │                 │              │          │
    └─────────────────┼──────────────┼──────────┘
                      │              │
                      └──────────────┘
```

### Матрица переходов

| Из \ В | OPEN | PAUSED | CLOSING | CLOSED | ABANDONED |
|--------|------|--------|---------|--------|-----------|
| **OPEN** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **PAUSED** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **CLOSING** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **CLOSED** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ABANDONED** | ❌ | ❌ | ❌ | ❌ | ❌ |

**Финальные статусы:** CLOSED, ABANDONED (из них нельзя выйти).

---

## 5. Commands (Write операции)

### OpenShiftCommand

Открытие новой смены.

```typescript
class OpenShiftCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: {
      sla: SlaSnapshot;    // SLA магазина
      actor: Actor;        // Кто открывает
      comment?: string;
    }
  )
}
```

**Валидация:**
- Магазин не должен иметь активных смен (OPEN/CLOSING)
- Actor должен иметь право открывать смену

**Результат:**
- Создаётся смена со статусом `OPEN`
- Добавляется событие `OPEN` в events
- `openedBy = actor`, `openedAt = now`

---

### PauseShiftCommand

Пауза смены.

```typescript
class PauseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    }
  )
}
```

**Валидация:** Текущий статус должен быть `OPEN`.

**Результат:**
- Статус → `PAUSED`
- Добавляется событие `PAUSE`

---

### ResumeShiftCommand

Возобновление смены после паузы.

```typescript
class ResumeShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    }
  )
}
```

**Валидация:** Текущий статус должен быть `PAUSED`.

**Результат:**
- Статус → `OPEN`
- Добавляется событие `RESUME`

---

### StartClosingShiftCommand

Начало процесса закрытия.

```typescript
class StartClosingShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    }
  )
}
```

**Валидация:** Текущий статус `OPEN` или `PAUSED`.

**Результат:**
- Статус → `CLOSING`
- Добавляется событие `START_CLOSING`

---

### CloseShiftCommand

Завершение закрытия смены (нормальное закрытие).

```typescript
class CloseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    }
  )
}
```

**Валидация:** Текущий статус должен быть `CLOSING`.

**Результат:**
- Статус → `CLOSED` (финальный)
- Добавляется событие `CLOSE`
- `closedBy = actor`, `closedAt = now`

---

### ForceCloseShiftCommand

Принудительное закрытие смены (администратор).

```typescript
class ForceCloseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;     // Должен быть Admin
      comment?: string; // Причина принудительного закрытия
    }
  )
}
```

**Валидация:** 
- Actor должен быть `Admin`
- Текущий статус `OPEN`, `PAUSED` или `CLOSING`

**Результат:**
- Статус → `CLOSED`
- Добавляется событие `FORCE_CLOSE`
- `closedBy = actor`, `closedAt = now`

---

### AbandonShiftCommand

Прерывание смены (аварийное закрытие).

```typescript
class AbandonShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      reason?: string;  // Причина прерывания
    }
  )
}
```

**Валидация:** Текущий статус `OPEN`, `PAUSED` или `CLOSING`.

**Результат:**
- Статус → `ABANDONED` (финальный)
- Добавляется событие `ABANDON`
- `closedBy = actor`, `closedAt = now`

---

### UpdateStatisticsCommand

Обновление статистики смены.

```typescript
class UpdateStatisticsCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      ordersCount?: number;
      deliveredOrdersCount?: number;
      canceledOrdersCount?: number;
      declinedOrdersCount?: number;
      totalIncome?: number;
      declinedIncome?: number;
      avgOrderPrice?: number;
      avgOrderAcceptanceDuration?: number;
      avgOrderAssemblyDuration?: number;
    }
  )
}
```

**Использование:** Вызывается при изменении статуса заказов для пересчёта агрегатов.

---

## 6. Queries (Read операции)

### GetShiftQuery

Получить одну смену.

```typescript
class GetShiftQuery {
  constructor(
    public readonly shiftId: string,
    public readonly options?: {
      select?: (keyof Shift)[]
    }
  )
}
```

---

### GetShiftsQuery

Получить список смен.

```typescript
class GetShiftsQuery {
  constructor(
    public readonly filters?: {
      shopId?: string;         // Смены конкретного магазина
      actorType?: ActorType;   // Кто открывал
      actorId?: string;        // Конкретный актор
      startDate?: Date;        // С даты
      endDate?: Date;          // До даты
    },
    public readonly options?: {
      select?: (keyof Shift)[]
    }
  )
}
```

**Примеры:**
```typescript
// Все смены магазина за месяц
new GetShiftsQuery({
  shopId: '507f...',
  startDate: new Date('2024-11-01'),
  endDate: new Date('2024-11-30')
})

// Смены конкретного сотрудника
new GetShiftsQuery({
  actorType: ActorType.EMPLOYEE,
  actorId: employeeId
})
```

---

## 7. Port (Интерфейс)

**Файл:** `shift.port.ts`

```typescript
interface ShiftPort {
  // QUERIES
  getShifts(
    query: GetShiftsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Shift>>;
  
  getShift(
    query: GetShiftQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Shift | null>;
  
  getCurrentShiftOfShop(
    shopId: string,
    queryOptions?: CommonQueryOptions
  ): Promise<Shift | null>;

  // COMMANDS
  openShift(
    command: OpenShiftCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shift>;
  
  closeShift(
    command: CloseShiftCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shift>;
  
  startClosing(
    command: StartClosingShiftCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shift>;
  
  pauseShift(
    command: PauseShiftCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shift>;
  
  resumeShift(
    command: ResumeShiftCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shift>;
  
  forceCloseShift(
    command: ForceCloseShiftCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shift>;
  
  abandonShift(
    command: AbandonShiftCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shift>;
  
  updateStatistics(
    command: UpdateStatisticsCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shift>;
}

export const SHIFT_PORT = Symbol('SHIFT_PORT');
```

---

## 8. Связи с другими модулями

### Domain Dependencies

#### ShopPort

**Связь:** Shift → Shop

**Использование:**
- Получение SLA магазина при открытии смены
- Валидация, что магазин существует и активен

#### EmployeePort

**Связь:** Shift ↔ Employee

**Использование:**
- При открытии смены: `employee.openedShift = shiftId`
- При закрытии смены: `employee.openedShift = null`
- Обновление `employee.status`

---

### Consumers

#### Interface Layer

- **EmployeeShiftsRoleService** - открытие/закрытие смен (`/employee/shifts`)
- **SellerShiftsRoleService** - управление сменами (`/seller/shifts`)
- **AdminShiftsRoleService** - админ панель (`/admin/shifts`)

#### Domain Modules

- **OrderService** - обновление статистики смены при изменении заказов

---

## 9. API Endpoints

### Employee API (`/employee/shifts`)

| Метод | Path | Описание | Command |
|-------|------|----------|---------|
| POST | `/open` | Открыть смену | OpenShiftCommand |
| PATCH | `/:shiftId/pause` | Пауза | PauseShiftCommand |
| PATCH | `/:shiftId/resume` | Возобновление | ResumeShiftCommand |
| PATCH | `/:shiftId/start-closing` | Начать закрытие | StartClosingShiftCommand |
| PATCH | `/:shiftId/close` | Закрыть | CloseShiftCommand |

---

### Seller API (`/seller/shifts`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | История смен | GetShiftsQuery |
| GET | `/:shiftId` | Детали смены | GetShiftQuery |
| PATCH | `/:shiftId/abandon` | Прервать смену | AbandonShiftCommand |

---

### Admin API (`/admin/shifts`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Все смены | GetShiftsQuery |
| GET | `/:shiftId` | Детали смены | GetShiftQuery |
| PATCH | `/:shiftId/force-close` | Принудительно закрыть | ForceCloseShiftCommand |

---

## Примеры использования

### Открытие смены сотрудником

```typescript
const command = new OpenShiftCommand(
  shopId,
  {
    sla: {
      acceptanceTimeLimit: 300,
      assemblyTimeLimit: 900,
      minOrderSum: 500,
      openAt: new Date('2024-11-22T08:00:00'),
      closedAt: new Date('2024-11-22T22:00:00')
    },
    actor: {
      actorType: ActorType.EMPLOYEE,
      actorId: employeeId,
      actorName: 'Иван Иванов'
    },
    comment: 'Начало рабочей смены'
  }
);

const shift = await shiftPort.openShift(command);
console.log(shift.status); // "open"
console.log(shift.events.length); // 1 (событие OPEN)
```

---

### Пауза и возобновление смены

```typescript
// Пауза
await shiftPort.pauseShift(new PauseShiftCommand(
  shiftId,
  {
    actor: employeeActor,
    comment: 'Перерыв на обед'
  }
));

// Возобновление
await shiftPort.resumeShift(new ResumeShiftCommand(
  shiftId,
  {
    actor: employeeActor
  }
));
```

---

### Принудительное закрытие админом

```typescript
const command = new ForceCloseShiftCommand(
  shiftId,
  {
    actor: {
      actorType: ActorType.ADMIN,
      actorId: adminId,
      actorName: 'Админ Платформы'
    },
    comment: 'Магазин закрыт на ремонт'
  }
);

await shiftPort.forceCloseShift(command);
// Смена закрыта принудительно, событие FORCE_CLOSE записано
```

---

## Заключение

**Shift Module** - самый сложный модуль из итерации 1.

**Ключевые особенности:**
- ✅ Event Sourcing (журнал всех событий)
- ✅ State Machine с валидацией переходов
- ✅ Actor-based tracking
- ✅ SLA снэпшоты для стабильной аналитики
- ✅ Агрегированная статистика
- ✅ Уникальная активная смена на магазин

**Архитектурные паттерны:**
- Event Sourcing
- State Machine
- Aggregate Root
- Snapshot Pattern

**Документация:**
- Полная state machine описана в `src/modules/shift/SHIFT_STATE_MACHINE.md`

---

> **Примечание:** При изменении схемы или state machine обновлять эту документацию.
