# Orchestrator — Координатор

Одна точка входа для сложных операций. Координирует несколько модулей.

---

## Зачем нужен оркестратор?

### Проблема без оркестратора

Чтобы принять товар, нужно:
1. Создать Receiving
2. Создать Batch для каждого товара
3. Создать BatchLocation
4. Создать Movement
5. Обновить закупочную цену в Storefront
6. Проверить алерты

```typescript
// Без оркестратора — 6 вызовов
await receivingPort.create(...);
await batchPort.create(...);
await batchLocationPort.create(...);
await movementPort.create(...);
await pricingPort.updatePurchasePrice(...);
await alertsPort.checkLowStock(...);
```

### С оркестратором

```typescript
// С оркестратором — 1 вызов
await orchestrator.createReceiving({...});
// Всё остальное происходит внутри!
```

---

## Структура

```
orchestrator/
├── inventory.orchestrator.ts
├── inventory.orchestrator.module.ts
└── index.ts
```

---

## InventoryOrchestrator

### Зависимости

```typescript
@Injectable()
export class InventoryOrchestrator {
  constructor(
    // Все порты модулей
    private readonly batchPort: BatchPort,
    private readonly batchLocationPort: BatchLocationPort,
    private readonly receivingPort: ReceivingPort,
    private readonly transferPort: TransferPort,
    private readonly writeOffPort: WriteOffPort,
    private readonly reservationPort: ReservationPort,
    private readonly movementPort: MovementPort,
    private readonly alertsPort: AlertsPort,
    private readonly pricingPort: PricingPort,
    
    // Для транзакций
    private readonly connection: Connection,
  ) {}
}
```

---

## Основные методы

### createReceiving — Приёмка

**Что делает:**
1. Создаёт Receiving
2. Для каждого товара создаёт Batch
3. Создаёт BatchLocation
4. Записывает Movement
5. Обновляет закупочные цены

```typescript
await orchestrator.createReceiving({
  sellerId,
  destination: {
    type: LocationType.SHOP,
    shopId,
  },
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
```

### reserveForOrder — Резервирование

**Что делает:**
1. Находит партии по FEFO
2. Увеличивает reservedQuantity в BatchLocation
3. Создаёт Reservation

```typescript
const reservation = await orchestrator.reserveForOrder({
  orderId,
  shopId,
  items: [
    { productId: 'apples', quantity: 5 },
    { productId: 'bananas', quantity: 3 },
  ],
});
```

### fulfillReservation — Сборка заказа

**Что делает:**
1. Уменьшает quantity в BatchLocation
2. Сбрасывает reservedQuantity
3. Обновляет Reservation → FULFILLED
4. Создаёт Movement (SALE)

```typescript
await orchestrator.fulfillReservation({
  reservationId,
  fulfilledItems: [
    { productId: 'apples', actualQuantity: 4.8 },  // Допуск веса
    { productId: 'bananas', actualQuantity: 3 },
  ],
  employeeId,
});
```

### createTransfer — Перемещение

**Что делает:**
1. Создаёт Transfer
2. Уменьшает quantity в источнике
3. Создаёт/увеличивает BatchLocation в назначении
4. Пересчитывает срок (если условия другие)
5. Создаёт Movement × 2

```typescript
await orchestrator.createTransfer({
  sellerId,
  source: {
    type: LocationType.WAREHOUSE,
    warehouseId,
  },
  destination: {
    type: LocationType.SHOP,
    shopId,
  },
  items: [
    { batchId, quantity: 50 },
  ],
  employeeId,
});
```

### writeOff — Списание

**Что делает:**
1. Создаёт WriteOff
2. Уменьшает quantity в BatchLocation
3. Обновляет статус партии если нужно
4. Создаёт Movement

```typescript
await orchestrator.writeOff({
  sellerId,
  location: {
    type: LocationType.SHOP,
    shopId,
  },
  items: [
    {
      batchId,
      quantity: 10,
      reason: WriteOffReason.EXPIRED,
    },
  ],
  employeeId,
  notes: 'Истёк срок годности',
});
```

### processReturn — Возврат от клиента

**Что делает:** Зависит от action:
- RESTOCK → возвращает в BatchLocation
- WRITE_OFF → списывает
- RETURN_TO_SUPPLIER → создаёт SupplierReturn

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
```

---

## Транзакции

Оркестратор использует MongoDB транзакции для атомарности:

```typescript
async createReceiving(input) {
  const session = await this.connection.startSession();
  
  try {
    session.startTransaction();
    
    // 1. Создаём Receiving
    const receiving = await this.receivingPort.create(..., { session });
    
    // 2. Создаём Batch
    const batch = await this.batchPort.create(..., { session });
    
    // 3. Создаём BatchLocation
    await this.batchLocationPort.create(..., { session });
    
    // 4. Создаём Movement
    await this.movementPort.create(..., { session });
    
    // Всё успешно — коммитим
    await session.commitTransaction();
    
    return receiving;
    
  } catch (error) {
    // Ошибка — откатываем ВСЁ
    await session.abortTransaction();
    throw error;
    
  } finally {
    session.endSession();
  }
}
```

**Зачем?**
```
Если при создании BatchLocation случилась ошибка,
то Receiving и Batch тоже откатятся.

Не будет "полусозданных" данных.
```

---

## Пример использования

```typescript
import {
  INVENTORY_ORCHESTRATOR,
  InventoryOrchestrator,
} from 'src/modules/new-inventory/orchestrator';

@Injectable()
export class ReceivingService {
  constructor(
    @Inject(INVENTORY_ORCHESTRATOR)
    private readonly orchestrator: InventoryOrchestrator,
  ) {}

  async receiveFromSupplier(dto: ReceiveFromSupplierDto) {
    // Один вызов — всё внутри
    const receiving = await this.orchestrator.createReceiving({
      sellerId: dto.sellerId,
      destination: {
        type: LocationType.SHOP,
        shopId: dto.shopId,
      },
      supplier: dto.supplier,
      items: dto.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        expirationDate: item.expirationDate,
        purchasePrice: item.purchasePrice,
      })),
      employeeId: dto.employeeId,
    });

    return receiving;
  }
}
```

---

## Что оркестратор НЕ делает

Оркестратор — для сложных операций. Для простых запросов используй порты напрямую:

```typescript
// ✓ Через порт — простой запрос
const stock = await batchLocationPort.getProductStockInLocation(...);
const batch = await batchPort.getById(...);

// ✓ Через оркестратор — сложная операция
await orchestrator.createReceiving(...);
await orchestrator.reserveForOrder(...);
```

---

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
