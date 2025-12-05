# Movement

История всех движений товара — аудит-лог складских операций.

## Структура

```
movement/
├── movement.schema.ts    # Схема
├── movement.enums.ts     # Типы движений
├── movement.commands.ts  # Команды
├── movement.queries.ts   # Запросы
├── movement.port.ts      # Интерфейс
├── movement.service.ts   # Реализация
├── movement.module.ts    # NestJS модуль
└── index.ts
```

## Movement

**Что это:** Запись о движении товара — каждая операция создаёт Movement.

```typescript
Movement {
  seller,
  batch,
  product,
  
  type,                     // Тип движения
  
  quantity,                 // Количество (+ или -)
  
  // Откуда/Куда
  source: { type, shop?, warehouse?, zone? },
  destination: { type, shop?, warehouse?, zone? },
  
  // Связь с операцией
  operationType,            // RECEIVING, TRANSFER, WRITE_OFF, SALE, RETURN
  operationId,              // ID операции
  
  // Контекст
  orderId,                  // Если продажа/возврат
  reason,                   // Причина (для списания)
  
  // Аудит
  performedBy,              // Кто выполнил
  performedAt,
  notes,
}
```

## Типы движений

| Type | Описание | quantity |
|------|----------|----------|
| `RECEIVING` | Приёмка | + |
| `TRANSFER_OUT` | Отправка (перемещение) | - |
| `TRANSFER_IN` | Получение (перемещение) | + |
| `SALE` | Продажа | - |
| `WRITE_OFF` | Списание | - |
| `RETURN_IN` | Возврат от клиента | + |
| `RETURN_OUT` | Возврат поставщику | - |
| `ADJUSTMENT` | Корректировка (инвентаризация) | ± |
| `RESERVATION` | Резервирование | 0 (только пометка) |
| `RESERVATION_RELEASE` | Снятие резерва | 0 |

## Как создаются Movement

**Автоматически** при выполнении операций:

```
Receiving (завершена)
    │
    └── Movement { type: 'RECEIVING', quantity: +100 }

Transfer (завершён)
    │
    ├── Movement { type: 'TRANSFER_OUT', quantity: -50, source: магазин А }
    └── Movement { type: 'TRANSFER_IN', quantity: +50, destination: магазин Б }

WriteOff (завершено)
    │
    └── Movement { type: 'WRITE_OFF', quantity: -10, reason: 'EXPIRED' }

Продажа (заказ доставлен)
    │
    └── Movement { type: 'SALE', quantity: -5, orderId: ... }
```

## Запросы

```typescript
// История движений партии
new MovementQueries.GetBatchMovementsQuery(batchId);

// Движения товара в локации
new MovementQueries.GetProductMovementsQuery({
  seller, product,
  locationType, locationId,
  fromDate, toDate,
});

// Все списания за период
new MovementQueries.GetWriteOffsQuery({
  seller,
  fromDate, toDate,
});

// Статистика движений
new MovementQueries.GetMovementStatisticsQuery({
  seller,
  locationType, locationId,
  fromDate, toDate,
});
```

## Пример: трассировка партии

```typescript
// Вся история партии
const movements = await movementPort.getBatchMovements(
  new MovementQueries.GetBatchMovementsQuery(batchId),
);

// movements:
// [
//   { type: 'RECEIVING', quantity: +100, destination: 'Склад' },
//   { type: 'TRANSFER_OUT', quantity: -50, source: 'Склад' },
//   { type: 'TRANSFER_IN', quantity: +50, destination: 'Магазин А' },
//   { type: 'SALE', quantity: -5, orderId: '...' },
//   { type: 'SALE', quantity: -3, orderId: '...' },
//   { type: 'WRITE_OFF', quantity: -2, reason: 'DAMAGED' },
// ]
```

## Экспорт

```typescript
import {
  MOVEMENT_PORT, MovementPort,
  Movement, MovementType,
  MovementCommands, MovementQueries,
} from 'src/modules/new-inventory/movement';
```
