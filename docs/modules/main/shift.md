# Shift Module

> **Модуль:** `src/modules/shift`  
> **Назначение:** жизненный цикл смен магазинов с фиксацией SLA, событий и агрегированной статистикой.

---

## 1. Обзор

- единая активная смена на магазин (валидируется индексом и сервисом);
- state machine с жёсткой валидацией переходов (полная диаграмма — `src/modules/shift/SHIFT_STATE_MACHINE.md`);
- event log фиксирует каждое действие, включая актора и комментарии;
- SLA снимок и агрегаты (заказы, доход, длительности) не зависят от дальнейших изменений настроек магазина;
- статистика обновляется из заказов через `UpdateStatisticsCommand`.

---

## 2. Схема данных (`shift.schema.ts`)

| Поле | Тип | Назначение |
|------|-----|------------|
| `shop` | `ObjectId<Shop>` | Магазин, для которого открыта смена. |
| `status` | `ShiftStatus` | Текущее состояние state machine. |
| `sla` | `SlaSnapshot` | Параметры магазина на момент открытия (лимиты времени, рабочие часы, min order sum). |
| `statistics` | `ShiftStatistics` | Агрегаты заказов (кол-во, доходы, длительности). |
| `openedBy` / `openedAt` | `ShiftActor` / `Date` | Кто и когда открыл смену. |
| `closedBy` / `closedAt` | `ShiftActor` / `Date \\ null` | Кто завершил смену. |
| `events` | `ShiftEvent[]` | Журнал всех операций (open/pause/.../abandon). |
| `createdAt`, `updatedAt`, `shiftId` | `Date`, `Date`, виртуал | Метаданные/виртуальный идентификатор. |

Вложенные типы:
- `ShiftActor` — `{ actorType: ActorType; actorId: ObjectId; actorName: string; }`.
- `SlaSnapshot` — лимиты SLA + окно работы магазина.
- `ShiftStatistics` — счётчики заказов и метрик (по умолчанию 0, обновляются через сервис).
- `ShiftEvent` — `{ type: ShiftEventType; at: Date; by: ShiftActor; comment?: string | null; payload?: Record<string, unknown>; }`.

**Индекс:** `uniq_open_or_closing_per_shop` запрещает несколько смен в статусах `OPEN/CLOSING` на один `shop`.

---

## 3. Enums (`shift.enums.ts`)

| Enum | Значения |
|------|----------|
| `ShiftStatus` | `OPEN`, `PAUSED`, `CLOSING`, `CLOSED`, `ABANDONED`. Финальные — `CLOSED`, `ABANDONED`. |
| `ShiftEventType` | `OPEN`, `PAUSE`, `RESUME`, `START_CLOSING`, `CLOSE`, `FORCE_CLOSE`, `ABANDON`. |
| `ActorType` | `Employee`, `Seller`, `Admin`. |

---

## 4. Commands (`shift.commands.ts`)

| Command | Разрешённые статусы | Эффект |
|---------|--------------------|--------|
| `OpenShiftCommand` | магазин без активных смен | Создаёт документ, пишет событие `OPEN`, хранит SLA. |
| `PauseShiftCommand` | `OPEN` | Статус → `PAUSED`, событие `PAUSE`. |
| `ResumeShiftCommand` | `PAUSED` | Статус → `OPEN`, событие `RESUME`. |
| `StartClosingShiftCommand` | `OPEN` или `PAUSED` | Статус → `CLOSING`, событие `START_CLOSING`. |
| `CloseShiftCommand` | `CLOSING` | Финализация → `CLOSED`, событие `CLOSE`, фиксирует `closedBy/closedAt`. |
| `ForceCloseShiftCommand` | `OPEN`, `PAUSED`, `CLOSING` (actor = Admin) | Принудительно закрывает, событие `FORCE_CLOSE`. |
| `AbandonShiftCommand` | `OPEN`, `PAUSED`, `CLOSING` | Завершает смену с `ABANDONED`, пишет причину в комментарий. |
| `UpdateStatisticsCommand` | любой существующий shift | Обновляет агрегаты (суммы, длительности, счётчики). |

Валидация статусов выполняется через `validateTransition` внутри `ShiftService`.

---

## 5. Queries (`shift.queries.ts`)

- `GetShiftQuery` — загрузка одной смены по `shiftId` с необязательным `select` перечнем полей.
- `GetShiftsQuery` — фильтрация по магазину, актору и диапазону дат, поддерживает `select`. Работает в паре с пагинацией сервиса.

---

## 6. Port (`shift.port.ts`)

Интерфейс экспортируется как `SHIFT_PORT` и содержит:
- чтение: `getShifts`, `getShift`, `getCurrentShiftOfShop` (возвращают `PaginateResult<Shift>` или `Shift | null`); 
- команды: `openShift`, `startClosing`, `closeShift`, `pauseShift`, `resumeShift`, `forceCloseShift`, `abandonShift`, `updateStatistics`.

Каждый метод принимает `CommonQueryOptions`/`CommonCommandOptions`, что позволяет передавать `session`, `select`, сортировку и параметры пагинации.

---

## 7. Service (`shift.service.ts`)

- реализует `ShiftPort` и работает поверх `ShiftModel` (Mongoose + paginate + lean virtuals);
- проверяет идентификаторы через `checkId` и допустимость переходов через `validateTransition`/матрицу состояний;
- все мутации фиксируются событиями (`ShiftEvent`) и обновлением `closedBy/closedAt` при финализации;
- `openShift` создаёт смену и стартовое событие за одну операцию, поддерживает транзакции через `commandOptions.session`;
- `getShifts` применяет фильтры по магазину, актору и датам; выбор полей делается через `selectFields`;
- `updateStatistics` обновляет агрегаты точечно через `assignField`, что исключает перезапись неуказанных значений.

---

## 8. Связи и использование

- **Shop Module** — источник SLA и расписания (значение передаётся в `OpenShiftCommand`).
- **Order / Cart процессы** — инициируют `UpdateStatisticsCommand`, когда меняются статусы заказов.
- **Employee / Seller интерфейсы** — вызывают порт для открытия/управления сменами в HTTP-слое (`EmployeeShiftsRoleService`, `SellerShiftsRoleService`, `AdminShiftsRoleService`).

Модуль не держит прямых зависимостей от других портов, взаимодействие происходит через оркестраторы и интерфейсный слой.

---

## 9. Пример использования порта

```typescript
const openCommand = new OpenShiftCommand(shopId, {
  sla: slaSnapshot,
  actor: employeeActor,
  comment: 'Начало смены'
});
const shift = await shiftPort.openShift(openCommand);

await shiftPort.updateStatistics(new UpdateStatisticsCommand(shift.shiftId!, {
  ordersCount: 12,
  deliveredOrdersCount: 10,
  totalIncome: 15000,
  avgOrderAssemblyDuration: 420
}));
```

Такой сценарий отражает основной поток: создание смены, затем инкрементальная синхронизация статистики из процессов заказов.

---

> При изменении схемы, state machine или состава команд необходимо синхронизировать документацию с файлом `docs/modules/README.md`.
