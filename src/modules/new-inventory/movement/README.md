# Movement — История движений

Каждое движение товара записывается в историю. Это аудит-лог.

---

## Зачем нужна история?

### 1. Трассировка

```
Где были эти яблоки?
→ 01.12: Приняли на склад (100 кг)
→ 03.12: Переместили в магазин (50 кг)
→ 05.12: Продали (5 кг)
→ 06.12: Продали (3 кг)
→ 07.12: Списали (2 кг, испортились)
```

### 2. Анализ потерь

```
Сколько списали за месяц?
→ WRITE_OFF (EXPIRED): 15 кг
→ WRITE_OFF (DAMAGED): 3 кг
→ WRITE_OFF (THEFT): 1 кг
```

### 3. Расследование

```
Клиент жалуется на качество
→ Заказ #5678
→ Movement: SALE, batch: #1234
→ Партия от поставщика "ООО Сады"
→ Связываемся с поставщиком
```

---

## Структура

```
movement/
├── movement.schema.ts
├── movement.enums.ts
├── movement.commands.ts
├── movement.queries.ts
├── movement.port.ts
├── movement.service.ts
├── movement.module.ts
└── index.ts
```

---

## Movement

### Поля

```typescript
Movement {
  seller,
  batch,                    // → Batch
  product,                  // → InventoryProduct
  
  type,                     // Тип движения
  
  quantity,                 // + или - (зависит от типа)
  
  // Откуда/Куда
  source: {
    type,
    shop,
    warehouse,
    zone,
  },
  destination: {
    type,
    shop,
    warehouse,
    zone,
  },
  
  // Связь с операцией
  operationType,            // RECEIVING, TRANSFER, SALE...
  operationId,              // ID операции
  
  // Контекст
  orderId,                  // Если продажа/возврат
  reason,                   // Для списания
  
  // Аудит
  performedBy,              // Кто выполнил
  performedAt,
  notes,
}
```

---

## Типы движений

| Тип | Описание | quantity |
|-----|----------|----------|
| `RECEIVING` | Приёмка товара | + |
| `TRANSFER_OUT` | Отправка (перемещение) | - |
| `TRANSFER_IN` | Получение (перемещение) | + |
| `SALE` | Продажа | - |
| `WRITE_OFF` | Списание | - |
| `RETURN_IN` | Возврат от клиента | + |
| `RETURN_OUT` | Возврат поставщику | - |
| `ADJUSTMENT` | Корректировка (инвентаризация) | + или - |
| `RESERVATION` | Резервирование | 0 (только пометка) |
| `RESERVATION_RELEASE` | Снятие резерва | 0 |
| `SHRINKAGE` | Усушка | - |

---

## Как создаются Movement

**Автоматически при операциях!**

### Приёмка

```
Receiving завершена
    ↓
Movement {
  type: 'RECEIVING',
  quantity: +100,
  destination: склад,
  operationType: 'RECEIVING',
  operationId: receiving._id,
}
```

### Перемещение

```
Transfer завершён
    ↓
Movement #1 {
  type: 'TRANSFER_OUT',
  quantity: -50,
  source: склад,
}
    +
Movement #2 {
  type: 'TRANSFER_IN',
  quantity: +50,
  destination: магазин,
}
```

### Продажа

```
Заказ собран и отдан
    ↓
Movement {
  type: 'SALE',
  quantity: -5,
  source: магазин,
  orderId: order._id,
}
```

### Списание

```
WriteOff завершён
    ↓
Movement {
  type: 'WRITE_OFF',
  quantity: -10,
  source: магазин,
  reason: 'EXPIRED',
}
```

---

## Примеры использования

### История партии

```typescript
const history = await movementPort.getBatchMovements(
  new MovementQueries.GetBatchMovementsQuery(batchId),
);

// history:
// [
//   { type: 'RECEIVING', quantity: +100, date: 01.12 },
//   { type: 'TRANSFER_OUT', quantity: -50, date: 03.12 },
//   { type: 'SALE', quantity: -5, date: 05.12 },
//   { type: 'SALE', quantity: -3, date: 06.12 },
//   { type: 'WRITE_OFF', quantity: -2, date: 07.12 },
// ]
```

### Все списания за период

```typescript
const writeOffs = await movementPort.getByType(
  new MovementQueries.GetMovementsByTypeQuery({
    seller: sellerId,
    type: MovementType.WRITE_OFF,
    fromDate: startOfMonth,
    toDate: endOfMonth,
  }),
);
```

### Движения по заказу

```typescript
const orderMovements = await movementPort.getByOrder(
  new MovementQueries.GetMovementsByOrderQuery(orderId),
);

// Какие партии пошли в этот заказ
```

### Статистика

```typescript
const stats = await movementPort.getStatistics(
  new MovementQueries.GetMovementStatisticsQuery({
    seller: sellerId,
    locationType: LocationType.SHOP,
    locationId: shopId,
    fromDate,
    toDate,
  }),
);

// stats:
// {
//   totalReceived: 500,
//   totalSold: 350,
//   totalWrittenOff: 30,
//   totalTransferredIn: 100,
//   totalTransferredOut: 50,
// }
```

---

## Аналитика потерь

```typescript
const losses = await movementPort.getLosses(
  new MovementQueries.GetLossesQuery({
    seller: sellerId,
    fromDate: startOfMonth,
    toDate: endOfMonth,
  }),
);

// losses:
// {
//   byReason: {
//     EXPIRED: 15,
//     DAMAGED: 3,
//     THEFT: 1,
//     SHRINKAGE: 5,
//   },
//   byProduct: {
//     'Яблоки': 10,
//     'Бананы': 8,
//     'Молоко': 6,
//   },
//   totalLoss: 24,
//   lossPercent: 4.8,  // От общего оборота
// }
```

---

## Экспорт

```typescript
import {
  MOVEMENT_PORT,
  MovementPort,
  
  Movement,
  MovementType,
  
  MovementCommands,
  MovementQueries,
} from 'src/modules/new-inventory/movement';
```
