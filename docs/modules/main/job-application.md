# Job Application Module

> **Модуль:** `src/modules/job-application`  
> **Назначение:** Управление заявками сотрудников на работу у продавцов

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

**Job Application** - модуль для управления заявками на работу. Позволяет сотрудникам откликаться на вакансии продавцов, а продавцам - принимать или отклонять заявки.

### Основные возможности

- ✅ Создание заявки от сотрудника к продавцу
- ✅ Просмотр списка заявок (для сотрудника и продавца)
- ✅ Принятие заявки (сотрудник нанимается)
- ✅ Отклонение заявки
- ✅ Фильтрация по статусам и датам
- ✅ Пагинация списков

### Бизнес-контекст

**Сценарий использования:**
1. Сотрудник (Employee) подает заявку на работу к продавцу (Seller)
2. Продавец видит заявку в своей панели
3. Продавец принимает → сотрудник становится его employee (через EmployeeService)
4. Продавец отклоняет → заявка архивируется со статусом REJECTED

---

## 2. Схема данных

### JobApplication Schema

**Файл:** `job-application.schema.ts`

```typescript
class JobApplication {
  _id: Types.ObjectId;
  jobApplicationId: string;  // Виртуальное поле
  
  // Сотрудник (кто подает заявку)
  employee: JobApplicationEmployee;  // Embedded document
  
  // Продавец (кому подается заявка)
  seller: JobApplicationSeller;      // Embedded document
  
  // Статус заявки
  status: JobApplicationStatus;      // default: PENDING
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}
```

### JobApplicationEmployee (Embedded)

```typescript
interface JobApplicationEmployee {
  employeeId: Types.ObjectId;   // Ссылка на Employee
  employeeName: string;         // Имя на момент заявки
  employeePhone: string;        // Телефон на момент заявки
}
```

**Зачем снэпшот:**
- Сохраняет данные сотрудника на момент подачи заявки
- Если сотрудник изменит имя/телефон, заявка останется с оригинальными данными

### JobApplicationSeller (Embedded)

```typescript
interface JobApplicationSeller {
  sellerId: Types.ObjectId;     // Ссылка на Seller
  sellerCompanyName: string;    // Название компании на момент заявки
}
```

### Индексы

Нет специальных индексов (используются дефолтные).

### Плагины

- **mongooseLeanVirtuals** - виртуальные поля в `.lean()`
- **mongoosePaginate** - пагинация списков

---

## 3. Енумы

### JobApplicationStatus

Статус заявки на работу.

```typescript
enum JobApplicationStatus {
  PENDING = 'pending',    // Ожидает рассмотрения
  ACCEPTED = 'accepted',  // Принята
  REJECTED = 'rejected'   // Отклонена
}
```

**Жизненный цикл:**
```
PENDING → ACCEPTED  (сотрудник нанят)
   ↓
   └─→ REJECTED  (заявка отклонена)
```

**Финальные статусы:** ACCEPTED, REJECTED

---

## 4. Commands (Write операции)

### CreateJobApplicationCommand

Создание новой заявки на работу.

```typescript
class CreateJobApplicationCommand {
  constructor(
    public readonly payload: {
      sellerId: string;      // К кому подается заявка
      employeeId: string;    // Кто подает заявку
    },
    public readonly jobApplicationId?: string  // Опциональный ID
  )
}
```

**Бизнес-логика:**
- Проверяет существование Employee и Seller
- Создает снэпшот данных сотрудника и продавца
- Устанавливает `status = PENDING`
- Проверяет, нет ли уже активной заявки от этого сотрудника к этому продавцу

**Исключения:**
- `NOT_FOUND` - если employee или seller не найдены
- `CONFLICT` - если уже есть активная заявка (PENDING)

---

### UpdateJobApplicationCommand

Обновление статуса заявки (принятие/отклонение).

```typescript
class UpdateJobApplicationCommand {
  constructor(
    public readonly jobApplicationId: string,
    public readonly payload: {
      status: JobApplicationStatus;  // ACCEPTED или REJECTED
    }
  )
}
```

**Бизнес-логика:**
- Можно обновить только заявки в статусе `PENDING`
- При `ACCEPTED`:
  - Нанимает сотрудника к продавцу через `EmployeeService`
  - Устанавливает `employee.employer = sellerId`
- При `REJECTED`:
  - Просто меняет статус, ничего не происходит

**Исключения:**
- `BAD_REQUEST` - если заявка уже обработана (не PENDING)

---

## 5. Queries (Read операции)

### GetJobApplicationQuery

Получить одну заявку по ID.

```typescript
class GetJobApplicationQuery {
  constructor(
    public readonly jobApplicationId: string,
    public readonly options?: {
      select?: (keyof JobApplication)[]
    }
  )
}
```

---

### GetJobApplicationsQuery

Получить список заявок с фильтрами.

```typescript
class GetJobApplicationsQuery {
  constructor(
    public readonly filters?: {
      sellerId?: string;                // Заявки к определенному продавцу
      employeeId?: string;              // Заявки от определенного сотрудника
      statuses?: JobApplicationStatus[]; // Фильтр по статусам
      fromDate?: Date;                  // С даты
      toDate?: Date;                    // До даты
    },
    public readonly options?: {
      select?: (keyof JobApplication)[]
    }
  )
}
```

**Использование:**
```typescript
// Все pending заявки продавца
new GetJobApplicationsQuery({
  sellerId: '507f...',
  statuses: [JobApplicationStatus.PENDING]
})

// История заявок сотрудника
new GetJobApplicationsQuery({
  employeeId: '507f...'
})
```

---

## 6. Port (Интерфейс)

**Файл:** `job-application.port.ts`

```typescript
interface JobApplicationPort {
  // QUERIES
  getPaginatedJobApplications(
    query: GetJobApplicationsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<JobApplication>>;
  
  getJobApplications(
    query: GetJobApplicationsQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<JobApplication[]>;
  
  getJobApplication(
    query: GetJobApplicationQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<JobApplication>;

  // COMMANDS
  createJobApplication(
    command: CreateJobApplicationCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication>;
  
  updateJobApplication(
    command: UpdateJobApplicationCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication>;
  
  deleteJobApplication(
    jobApplicationId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<JobApplication>;
}

export const JOB_APPLICATION_PORT = Symbol('JOB_APPLICATION_PORT');
```

---

## 7. Связи с другими модулями

### Domain Dependencies

#### EmployeePort

**Связь:** JobApplication → Employee

**Использование:**
- Проверка существования сотрудника при создании заявки
- Получение данных для снэпшота (имя, телефон)
- Обновление `employee.employer` при принятии заявки

#### SellerPort

**Связь:** JobApplication → Seller

**Использование:**
- Проверка существования продавца при создании заявки
- Получение названия компании для снэпшота

---

### Consumers

#### Interface Layer

- **SellerJobApplicationsRoleService** - управление заявками для продавца (`/seller/job-applications`)
- **EmployeeJobApplicationsRoleService** - подача заявок сотрудником (если реализовано)

---

## 8. API Endpoints

### Seller API (`/seller/job-applications`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Получить заявки к продавцу | GetJobApplicationsQuery |
| GET | `/:jobApplicationId` | Получить детали заявки | GetJobApplicationQuery |
| PATCH | `/:jobApplicationId/approve` | Принять заявку | UpdateJobApplicationCommand (ACCEPTED) |
| DELETE | `/:jobApplicationId` | Отклонить заявку | UpdateJobApplicationCommand (REJECTED) |

**Авторизация:** JWT токен с типом `seller`.

**Автофильтрация:** `sellerId` берется из JWT токена автоматически.

---

## Примеры использования

### Создание заявки

```typescript
const command = new CreateJobApplicationCommand({
  sellerId: '507f...',
  employeeId: '507f...'
});

const application = await jobApplicationPort.createJobApplication(command);
console.log(application.status); // "pending"
```

---

### Принятие заявки (найм сотрудника)

```typescript
const command = new UpdateJobApplicationCommand(
  jobApplicationId,
  { status: JobApplicationStatus.ACCEPTED }
);

await jobApplicationPort.updateJobApplication(command);
// Теперь employee.employer = sellerId
```

---

### Получение pending заявок продавца

```typescript
const query = new GetJobApplicationsQuery({
  sellerId: authedSeller.id,
  statuses: [JobApplicationStatus.PENDING]
});

const result = await jobApplicationPort.getPaginatedJobApplications(query, {
  pagination: { page: 1, pageSize: 10 }
});
```

---

## Заключение

**Job Application Module** - простой, но важный модуль для найма сотрудников.

**Ключевые особенности:**
- ✅ Embedded снэпшоты данных (сохраняют историю)
- ✅ Простая state machine (PENDING → ACCEPTED/REJECTED)
- ✅ Автоматический найм при принятии заявки
- ✅ Связь с Employee и Seller модулями

**Связанные модули:**
- **Employee** - управление сотрудниками
- **Seller** - управление продавцами

---

> **Примечание:** При изменении схемы или портов обновлять эту документацию.
