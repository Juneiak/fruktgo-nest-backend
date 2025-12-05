# Operations

Все складские операции.

## Структура

```
operations/
├── receiving/       # Приёмка товара
├── transfer/        # Перемещение между локациями
├── write-off/       # Списание
├── return/          # Возвраты (от клиента и поставщику)
├── audit/           # Инвентаризация
├── consolidation/   # Автоконсолидация партий
└── index.ts
```

---

## Receiving (Приёмка)

Приёмка товара от поставщика или с производства.

```typescript
Receiving {
  seller,
  destination: { type, shop?, warehouse? },
  supplier,
  
  items: [{
    product,
    expectedQuantity,       // Сколько ожидали
    actualQuantity,         // Сколько пришло
    expirationDate,
    purchasePrice,
    batch,                  // Созданная партия
  }],
  
  status,                   // DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
  
  performedBy,              // Сотрудник
  completedAt,
  notes,
}
```

**Что происходит при приёмке:**
1. Создаётся `Receiving` в статусе `DRAFT`
2. Добавляются товары с количеством и сроками
3. При завершении создаются `Batch` и `BatchLocation`
4. Создаётся `Movement` (запись в историю)

---

## Transfer (Перемещение)

Перемещение товара между локациями.

```typescript
Transfer {
  seller,
  source: { type, shop?, warehouse? },
  destination: { type, shop?, warehouse? },
  
  items: [{
    batch,
    product,
    quantity,
  }],
  
  status,                   // DRAFT, IN_TRANSIT, COMPLETED, CANCELLED
  
  initiatedBy,
  completedBy,
}
```

**Что происходит:**
1. `BatchLocation` в источнике уменьшается
2. `BatchLocation` в назначении создаётся/увеличивается
3. Если включена динамика сроков — пересчитывается `effectiveExpirationDate`
4. Создаётся `Movement`

---

## WriteOff (Списание)

Списание товара по различным причинам.

```typescript
WriteOff {
  seller,
  location: { type, shop?, warehouse? },
  
  items: [{
    batch,
    product,
    quantity,
    reason,                 // EXPIRED, DAMAGED, LOST, THEFT, FOR_PRODUCTION
  }],
  
  status,                   // DRAFT, COMPLETED, CANCELLED
  
  performedBy,
  approvedBy,               // Если требуется подтверждение
  notes,
}
```

**Причины списания:**

| Reason | Описание |
|--------|----------|
| `EXPIRED` | Истёк срок годности |
| `DAMAGED` | Повреждён |
| `LOST` | Утерян |
| `THEFT` | Кража |
| `SHRINKAGE` | Усушка/естественная убыль |
| `FOR_PRODUCTION` | Использован в производстве |
| `QUALITY` | Не соответствует качеству |
| `OTHER` | Другое |

---

## Return (Возвраты)

Возврат товара от клиента или поставщику.

```typescript
// Возврат от клиента
CustomerReturn {
  seller,
  order,                    // Заказ
  customer,
  
  items: [{
    product, batch, quantity,
    reason,                 // QUALITY, WRONG_ITEM, CHANGED_MIND
    condition,              // SELLABLE, DAMAGED, UNSELLABLE
    action,                 // RESTOCK, WRITE_OFF, RETURN_TO_SUPPLIER
  }],
  
  status,
}

// Возврат поставщику
SupplierReturn {
  seller,
  supplier,
  
  items: [{
    batch, product, quantity,
    reason,                 // QUALITY, EXPIRED_ON_ARRIVAL, WRONG_ITEM
  }],
  
  status,                   // PENDING, SHIPPED, CONFIRMED, DISPUTE
}
```

**Логика возврата от клиента:**
- `SELLABLE` → возвращается в BatchLocation
- `DAMAGED` → списывается или возврат поставщику
- `UNSELLABLE` → списывается

---

## Audit (Инвентаризация)

Сверка фактических остатков с учётными.

```typescript
Audit {
  seller,
  location: { type, shop?, warehouse? },
  
  items: [{
    product,
    expectedQuantity,       // По системе
    actualQuantity,         // По факту
    discrepancy,            // Расхождение
    resolution,             // WRITE_OFF, ADJUSTMENT, FOUND
    notes,
  }],
  
  status,                   // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
  
  scheduledAt,
  startedAt,
  completedAt,
  performedBy,
}
```

**Что происходит:**
1. Создаётся аудит, система подтягивает ожидаемые остатки
2. Сотрудник вводит фактические количества
3. Расхождения разрешаются: списание, корректировка, находка
4. BatchLocation обновляются

---

## Consolidation (Консолидация)

Автоматическое объединение мелких остатков.

```typescript
// Происходит автоматически:
// 1. При инвентаризации (обнаружен смешанный товар)
// 2. По cron (мелкие остатки < порога)
// 3. После списания (остались крохи)

const result = await consolidationPort.autoConsolidate(
  new ConsolidationCommands.AutoConsolidateCommand({
    locationId,
    productId,
    minQuantityThreshold: 0.5,  // Объединять остатки < 500г
  }),
);

// Результат: создан MixedBatch с трассировкой компонентов
```

---

## Общая схема операций

```
Поставщик
    │
    ▼
 Receiving → Batch + BatchLocation
    │
    ├─── Transfer → BatchLocation (новая локация)
    │
    ├─── WriteOff → Movement (списание)
    │
    ├─── Продажа → Movement (продажа) → reservedQuantity → deduct
    │
    └─── Return ──┬── Restock → BatchLocation
                  ├── WriteOff → Movement
                  └── SupplierReturn → Поставщик
```

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
  
  // WriteOff
  WRITE_OFF_PORT, WriteOffPort,
  WriteOff, WriteOffReason,
  
  // Return
  RETURN_PORT, ReturnPort,
  CustomerReturn, SupplierReturn,
  
  // Audit
  AUDIT_PORT, AuditPort,
  Audit, AuditStatus,
  
  // Consolidation
  CONSOLIDATION_PORT, ConsolidationPort,
  ConsolidationCommands,
} from 'src/modules/new-inventory/operations';
```
