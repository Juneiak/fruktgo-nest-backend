# Shift State Machine (Машина состояний смены)

## Диаграмма переходов

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

## Статусы смены

| Статус | Описание | Финальный |
|--------|----------|-----------|
| **OPEN** | Смена открыта и активна | ❌ |
| **PAUSED** | Смена приостановлена | ❌ |
| **CLOSING** | Смена в процессе закрытия | ❌ |
| **CLOSED** | Смена закрыта | ✅ |
| **ABANDONED** | Смена оставлена/прервана | ✅ |

## Матрица допустимых переходов

| Из \ В | OPEN | PAUSED | CLOSING | CLOSED | ABANDONED |
|--------|------|--------|---------|--------|-----------|
| **OPEN** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **PAUSED** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **CLOSING** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **CLOSED** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ABANDONED** | ❌ | ❌ | ❌ | ❌ | ❌ |

## Команды и переходы

### 1. `openShift` → OPEN
**Начальное состояние:** нет смены  
**Конечное состояние:** OPEN  
**Описание:** Создает новую смену

### 2. `pauseShift` → PAUSED
**Начальное состояние:** OPEN  
**Конечное состояние:** PAUSED  
**Описание:** Приостанавливает активную смену  
**Валидация:** Можно только из OPEN

### 3. `resumeShift` → OPEN
**Начальное состояние:** PAUSED  
**Конечное состояние:** OPEN  
**Описание:** Возобновляет приостановленную смену  
**Валидация:** Можно только из PAUSED

### 4. `startClosing` → CLOSING
**Начальные состояния:** OPEN, PAUSED  
**Конечное состояние:** CLOSING  
**Описание:** Начинает процесс закрытия смены  
**Валидация:** Можно из OPEN или PAUSED

### 5. `closeShift` → CLOSED
**Начальное состояние:** CLOSING  
**Конечное состояние:** CLOSED  
**Описание:** Завершает закрытие смены (нормальное завершение)  
**Валидация:** Можно только из CLOSING

### 6. `forceCloseShift` → CLOSED
**Начальные состояния:** OPEN, PAUSED, CLOSING  
**Конечное состояние:** CLOSED  
**Описание:** Принудительно закрывает смену (админ)  
**Валидация:** Можно из любого активного статуса  
**Права:** Только администратор

### 7. `abandonShift` → ABANDONED
**Начальные состояния:** OPEN, PAUSED, CLOSING  
**Конечное состояние:** ABANDONED  
**Описание:** Оставляет/прерывает смену  
**Валидация:** Можно из любого активного статуса

## Журнал событий (Events)

Каждый переход автоматически создает событие в массиве `events`:

| Команда | EventType |
|---------|-----------|
| `openShift` | OPEN |
| `pauseShift` | PAUSE |
| `resumeShift` | RESUME |
| `startClosing` | START_CLOSING |
| `closeShift` | CLOSE |
| `forceCloseShift` | FORCE_CLOSE |
| `abandonShift` | ABANDON |

## Бизнес-правила

### Ограничения
- **Один магазин = одна активная смена**: индекс `uniq_open_or_closing_per_shop` гарантирует, что магазин может иметь только одну смену в статусе OPEN или CLOSING
- **Финальные состояния**: из CLOSED и ABANDONED нет переходов
- **Неизменяемый SLA**: снэпшот SLA сохраняется при открытии и не меняется

### Стандартный flow
```
OPEN → PAUSED → OPEN → CLOSING → CLOSED
```

### Альтернативный flow (принудительное закрытие)
```
OPEN → CLOSED (через forceCloseShift)
PAUSED → CLOSED (через forceCloseShift)
```

### Прерывание
```
OPEN → ABANDONED
PAUSED → ABANDONED
CLOSING → ABANDONED
```

## Валидация в коде

```typescript
// Матрица переходов
const SHIFT_STATUS_TRANSITIONS: Record<ShiftStatus, ShiftStatus[]> = {
  [ShiftStatus.OPEN]: [ShiftStatus.PAUSED, ShiftStatus.CLOSING, ShiftStatus.CLOSED, ShiftStatus.ABANDONED],
  [ShiftStatus.PAUSED]: [ShiftStatus.OPEN, ShiftStatus.CLOSING, ShiftStatus.CLOSED, ShiftStatus.ABANDONED],
  [ShiftStatus.CLOSING]: [ShiftStatus.CLOSED, ShiftStatus.ABANDONED],
  [ShiftStatus.CLOSED]: [],
  [ShiftStatus.ABANDONED]: [],
};

// Валидация используется во всех command методах
validateTransition(currentStatus, newStatus, action);
```

## Примеры ошибок

### ❌ Невозможные переходы
```typescript
// CLOSED → OPEN
DomainError: Невозможно выполнить "возобновление смены": 
переход из статуса "closed" в "open" недопустим

// OPEN → OPEN
DomainError: Невозможно выполнить "постановка на паузу": 
переход из статуса "open" в "open" недопустим
```

### ✅ Возможные переходы
```typescript
// PAUSED → OPEN
resumeShift() // OK

// OPEN → CLOSING
startClosing() // OK
```
