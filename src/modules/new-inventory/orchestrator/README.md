# Orchestrator

Координатор складских операций — единая точка входа для сложных сценариев.

## Структура

```
orchestrator/
├── inventory.orchestrator.ts   # Оркестратор
├── inventory.orchestrator.module.ts
└── index.ts
```

## InventoryOrchestrator

**Что это:** Координирует операции, которые затрагивают несколько модулей.

```typescript
@Injectable()
export class InventoryOrchestrator {
  constructor(
    private readonly batchPort: BatchPort,
    private readonly batchLocationPort: BatchLocationPort,
    private readonly receivingPort: ReceivingPort,
    private readonly transferPort: TransferPort,
    private readonly writeOffPort: WriteOffPort,
    private readonly reservationPort: ReservationPort,
    private readonly movementPort: MovementPort,
    private readonly alertsPort: AlertsPort,
    private readonly pricingPort: PricingPort,
  ) {}
}
```

## Основные методы

### createReceiving

Создаёт приёмку с автоматическим созданием партий.

```typescript
await orchestrator.createReceiving({
  sellerId,
  destination: { type: LocationType.SHOP, shopId },
  supplier: 'ООО Сады Кубани',
  items: [
    {
      productId,
      quantity: 100,
      expirationDate: new Date('2024-12-20'),
      purchasePrice: 80,
    },
  ],
  employeeId,
});

// Результат:
// 1. Создан Receiving
// 2. Созданы Batch для каждого товара
// 3. Созданы BatchLocation
// 4. Созданы Movement записи
// 5. Обновлены закупочные цены в Storefront
```

### reserveForOrder

Резервирует товар под заказ с FEFO.

```typescript
const reservation = await orchestrator.reserveForOrder({
  orderId,
  shopId,
  items: [
    { productId: 'apples', quantity: 5 },
    { productId: 'oranges', quantity: 3 },
  ],
});

// Результат:
// 1. Найдены партии по FEFO
// 2. Увеличен reservedQuantity в BatchLocation
// 3. Создана Reservation
// 4. Созданы Movement записи
```

### fulfillReservation

Выполняет резерв (при сборке заказа).

```typescript
await orchestrator.fulfillReservation({
  reservationId,
  fulfilledItems: [
    { productId: 'apples', actualQuantity: 4.8 },  // Допуск веса
  ],
  employeeId,
});

// Результат:
// 1. Уменьшен quantity в BatchLocation
// 2. Сброшен reservedQuantity
// 3. Reservation → FULFILLED
// 4. Созданы Movement (SALE)
```

### createTransfer

Перемещает товар между локациями.

```typescript
await orchestrator.createTransfer({
  sellerId,
  source: { type: LocationType.WAREHOUSE, warehouseId },
  destination: { type: LocationType.SHOP, shopId },
  items: [
    { batchId, quantity: 50 },
  ],
  employeeId,
});

// Результат:
// 1. Создан Transfer
// 2. Уменьшен quantity в source BatchLocation
// 3. Создан/увеличен destination BatchLocation
// 4. Пересчитан effectiveExpirationDate (если включена динамика)
// 5. Созданы Movement записи
```

### writeOff

Списывает товар.

```typescript
await orchestrator.writeOff({
  sellerId,
  location: { type: LocationType.SHOP, shopId },
  items: [
    { batchId, quantity: 10, reason: WriteOffReason.EXPIRED },
  ],
  employeeId,
  notes: 'Истёк срок годности',
});

// Результат:
// 1. Создан WriteOff
// 2. Уменьшен quantity в BatchLocation
// 3. Если quantity = 0 → BatchLocation.status = WRITTEN_OFF
// 4. Если весь batch списан → Batch.status = WRITTEN_OFF
// 5. Созданы Movement записи
```

### processReturn

Обрабатывает возврат от клиента.

```typescript
await orchestrator.processReturn({
  orderId,
  customerId,
  items: [
    {
      productId,
      batchId,
      quantity: 2,
      reason: ReturnReason.QUALITY,
      condition: ReturnCondition.SELLABLE,
      action: ReturnAction.RESTOCK,
    },
  ],
  employeeId,
});

// Результат в зависимости от action:
// RESTOCK → товар возвращается в BatchLocation
// WRITE_OFF → списывается
// RETURN_TO_SUPPLIER → создаётся SupplierReturn
```

## Зачем оркестратор

**Без оркестратора:**
```typescript
// Нужно вручную вызывать 5+ сервисов в правильном порядке
await receivingPort.create(...);
await batchPort.create(...);
await batchLocationPort.create(...);
await movementPort.create(...);
await pricingPort.updatePurchasePrice(...);
await alertsPort.checkLowStock(...);
```

**С оркестратором:**
```typescript
await orchestrator.createReceiving({ ... });
// Всё происходит автоматически
```

## Транзакции

Оркестратор использует MongoDB транзакции для атомарности:

```typescript
async createReceiving(input) {
  const session = await this.connection.startSession();
  try {
    session.startTransaction();
    
    // ... все операции ...
    
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## Экспорт

```typescript
import {
  INVENTORY_ORCHESTRATOR,
  InventoryOrchestrator,
} from 'src/modules/new-inventory/orchestrator';

// Использование
@Inject(INVENTORY_ORCHESTRATOR)
private readonly orchestrator: InventoryOrchestrator
```
