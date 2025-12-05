# Operations — Складские операции

Всё, что можно делать с товаром: принять, переместить, списать, вернуть, пересчитать.

---

## Какие операции есть

```
operations/
├── receiving/       # Приёмка — принимаем товар от поставщика
├── transfer/        # Перемещение — перевозим между локациями
├── write-off/       # Списание — выбрасываем испорченное
├── return/          # Возврат — от клиента или поставщику
├── audit/           # Инвентаризация — пересчитываем остатки
├── consolidation/   # Консолидация — объединяем мелкие остатки
└── index.ts
```

---

## Receiving — Приёмка

**Что делаем:** Принимаем товар от поставщика.

**Что происходит:**
1. Создаём документ приёмки (Receiving)
2. Для каждого товара создаём партию (Batch)
3. Кладём в локацию (BatchLocation)
4. Записываем в историю (Movement)

### Пример

```
Поставщик привёз:
├── 100 кг яблок (срок до 20.12, цена 80₽)
└── 50 кг бананов (срок до 15.12, цена 60₽)

Результат:
├── Receiving (документ)
├── Batch #1234 (яблоки)
├── Batch #1235 (бананы)
├── BatchLocation (яблоки → склад)
├── BatchLocation (бананы → склад)
└── Movement × 2 (история)
```

### Статусы приёмки

```
DRAFT       — Черновик (можно редактировать)
IN_PROGRESS — В процессе (сотрудник принимает)
COMPLETED   — Завершена (партии созданы)
CANCELLED   — Отменена
```

### Поля

```typescript
Receiving {
  seller,
  
  // Куда принимаем
  destination: {
    type,           // SHOP или WAREHOUSE
    shop,
    warehouse,
  },
  
  // Поставщик
  supplier,
  invoiceNumber,    // Номер накладной
  
  // Товары
  items: [{
    product,
    expectedQuantity,     // Сколько ожидали
    actualQuantity,       // Сколько пришло
    expirationDate,
    purchasePrice,
    batch,                // Созданная партия
    notes,
  }],
  
  status,
  performedBy,      // Кто принимал
  completedAt,
  notes,
}
```

---

## Transfer — Перемещение

**Что делаем:** Перевозим товар из одной локации в другую.

**Что происходит:**
1. Уменьшаем остаток в источнике
2. Увеличиваем остаток в назначении
3. Если условия хранения другие — пересчитываем срок
4. Записываем в историю (2 Movement: OUT + IN)

### Пример

```
Перемещаем 50 кг яблок со склада в магазин:

До:
├── Склад: 100 кг
└── Магазин: 0 кг

После:
├── Склад: 50 кг
└── Магазин: 50 кг

Movement:
├── TRANSFER_OUT (склад): -50 кг
└── TRANSFER_IN (магазин): +50 кг
```

### Статусы

```
DRAFT      — Черновик
IN_TRANSIT — В пути (отправлено, не получено)
COMPLETED  — Завершено (получено)
CANCELLED  — Отменено
```

### Поля

```typescript
Transfer {
  seller,
  
  // Откуда
  source: {
    type,
    shop,
    warehouse,
  },
  
  // Куда
  destination: {
    type,
    shop,
    warehouse,
  },
  
  // Что перемещаем
  items: [{
    batch,
    product,
    quantity,
  }],
  
  status,
  initiatedBy,      // Кто отправил
  completedBy,      // Кто принял
  completedAt,
}
```

---

## WriteOff — Списание

**Что делаем:** Списываем товар (испортился, украли, использовали).

**Что происходит:**
1. Уменьшаем остаток в BatchLocation
2. Если всё списано — меняем статус партии
3. Записываем в историю (Movement)

### Причины списания

```
EXPIRED        — Истёк срок годности
DAMAGED        — Повреждён
LOST           — Утерян
THEFT          — Кража
SHRINKAGE      — Усушка / естественная убыль
FOR_PRODUCTION — Использован в производстве (смузи, нарезка)
QUALITY        — Не соответствует качеству
OTHER          — Другое
```

### Пример

```
Списываем 10 кг яблок (испортились):

До:
└── BatchLocation: 50 кг

После:
└── BatchLocation: 40 кг

Movement:
└── WRITE_OFF: -10 кг, reason: EXPIRED
```

### Поля

```typescript
WriteOff {
  seller,
  
  // Откуда списываем
  location: {
    type,
    shop,
    warehouse,
  },
  
  // Что списываем
  items: [{
    batch,
    product,
    quantity,
    reason,         // EXPIRED, DAMAGED...
    notes,
  }],
  
  status,           // DRAFT, COMPLETED, CANCELLED
  performedBy,
  approvedBy,       // Если требуется подтверждение
  notes,
}
```

---

## Return — Возвраты

### Возврат от клиента

**Что делаем:** Клиент вернул товар.

**Что происходит:** Зависит от состояния товара:
- **SELLABLE** (можно продать) → возвращаем в BatchLocation
- **DAMAGED** (повреждён) → списываем или возврат поставщику
- **UNSELLABLE** (нельзя продать) → списываем

```typescript
CustomerReturn {
  seller,
  order,
  customer,
  
  items: [{
    product,
    batch,
    quantity,
    reason,         // QUALITY, WRONG_ITEM, CHANGED_MIND
    condition,      // SELLABLE, DAMAGED, UNSELLABLE
    action,         // RESTOCK, WRITE_OFF, RETURN_TO_SUPPLIER
  }],
  
  status,
  processedBy,
}
```

### Возврат поставщику

**Что делаем:** Возвращаем некачественный товар поставщику.

```typescript
SupplierReturn {
  seller,
  supplier,
  
  items: [{
    batch,
    product,
    quantity,
    reason,         // QUALITY, EXPIRED_ON_ARRIVAL, WRONG_ITEM
  }],
  
  status,           // PENDING, SHIPPED, CONFIRMED, DISPUTE
}
```

---

## Audit — Инвентаризация

**Что делаем:** Пересчитываем фактические остатки.

**Что происходит:**
1. Система показывает ожидаемые остатки
2. Сотрудник вводит фактические
3. Расхождения разрешаются:
   - Недостача → списание
   - Излишки → корректировка
   - Смешанный товар → создаём MixedBatch

### Пример

```
Инвентаризация холодильника:

Яблоки:
├── Ожидаем: 50 кг
├── Факт: 45 кг
├── Расхождение: -5 кг
└── Решение: WRITE_OFF (недостача)

Бананы:
├── Ожидаем: 30 кг
├── Факт: 32 кг
├── Расхождение: +2 кг
└── Решение: ADJUSTMENT (нашли)
```

### Статусы

```
PLANNED     — Запланирована
IN_PROGRESS — В процессе
COMPLETED   — Завершена
CANCELLED   — Отменена
```

### Поля

```typescript
Audit {
  seller,
  
  // Где проводим
  location: {
    type,
    shop,
    warehouse,
    zone,           // Можно отдельную зону
  },
  
  // Товары
  items: [{
    product,
    expectedQuantity,     // По системе
    actualQuantity,       // По факту
    discrepancy,          // Расхождение
    resolution,           // WRITE_OFF, ADJUSTMENT, FOUND, MIXED
    notes,
  }],
  
  status,
  scheduledAt,      // Когда запланирована
  startedAt,
  completedAt,
  performedBy,
}
```

---

## Consolidation — Консолидация

**Что делаем:** Объединяем мелкие остатки в одну партию.

**Когда нужно:**
- Много мелких остатков (по 100-200г)
- При инвентаризации нашли смешанный товар
- Автоматически по расписанию

### Пример

```
До:
├── Партия #1: 200г яблок
├── Партия #2: 300г яблок
└── Партия #3: 150г яблок

После консолидации:
└── MixedBatch: 650г яблок
    ├── Компонент: Партия #1, 200г
    ├── Компонент: Партия #2, 300г
    └── Компонент: Партия #3, 150г
```

### Зачем

1. Легче учитывать (одна запись вместо трёх)
2. Сохраняется трассировка (знаем из чего состоит)
3. Срок = минимальный из всех (безопасность)

---

## Общий поток товара

```
Поставщик
    │
    ▼
RECEIVING ──→ Batch + BatchLocation
    │
    ├──→ TRANSFER ──→ BatchLocation (новая локация)
    │
    ├──→ SALE (через Reservation) ──→ Movement
    │
    ├──→ WRITE_OFF ──→ Movement (списание)
    │
    └──→ RETURN
           ├──→ RESTOCK ──→ BatchLocation
           ├──→ WRITE_OFF
           └──→ SUPPLIER_RETURN ──→ Поставщик
```

---

## Экспорт

```typescript
import {
  // Receiving
  RECEIVING_PORT, ReceivingPort,
  Receiving, ReceivingStatus,
  ReceivingCommands, ReceivingQueries,
  
  // Transfer
  TRANSFER_PORT, TransferPort,
  Transfer, TransferStatus,
  TransferCommands, TransferQueries,
  
  // WriteOff
  WRITE_OFF_PORT, WriteOffPort,
  WriteOff, WriteOffReason,
  WriteOffCommands, WriteOffQueries,
  
  // Return
  RETURN_PORT, ReturnPort,
  CustomerReturn, SupplierReturn,
  ReturnCommands, ReturnQueries,
  
  // Audit
  AUDIT_PORT, AuditPort,
  Audit, AuditStatus,
  AuditCommands, AuditQueries,
  
  // Consolidation
  CONSOLIDATION_PORT, ConsolidationPort,
  ConsolidationCommands, ConsolidationQueries,
} from 'src/modules/new-inventory/operations';
```
