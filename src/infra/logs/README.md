# Logs Module

> `src/infra/logs/`

Централизованный аудит-лог. Фиксирует действия пользователей и системные события с поддержкой фильтрации по ролям.

## Структура

```
src/infra/logs/
├── index.ts
├── log.schema.ts
├── logs.enums.ts
├── logs.events.ts
├── logs.commands.ts
├── logs.queries.ts
├── logs.port.ts
├── logs.service.ts
└── logs.module.ts
```

## Импорт

```typescript
import {
  LogsPort,
  LOGS_PORT,
  LogsCommands,
  LogsQueries,
  LogsEnums,
  Log,
} from 'src/infra/logs';

@Inject(LOGS_PORT) private readonly logsPort: LogsPort
```

## Схема

```typescript
class Log {
  entityType: LogEntityType;  // 'Order' | 'Shop' | ...
  entity: Types.ObjectId;     // refPath → entityType
  forRoles: UserType[];       // кому виден лог
  logLevel: LogLevel;         // low | medium | high | critical
  text: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

## Енумы

```typescript
enum LogLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

enum LogEntityType {
  CUSTOMER = 'Customer',
  EMPLOYEE = 'Employee',
  ORDER = 'Order',
  PRODUCT = 'Product',
  SELLER = 'Seller',
  SHIFT = 'Shift',
  SHOP_PRODUCT = 'ShopProduct',
  SHOP = 'Shop',
  SHOP_ACCOUNT = 'ShopAccount',
  SELLER_ACCOUNT = 'SellerAccount',
}
```

## API

### Queries

| Метод | Описание |
|-------|----------|
| `getLog(logId)` | Получить лог по ID |
| `getEntityLogs(query)` | Логи сущности (paginated) |

### Commands

| Метод | Описание |
|-------|----------|
| `createLog(command)` | Создать лог |
| `deleteLog(logId)` | Удалить лог |
| `deleteAllEntityLogs(command)` | Удалить все логи сущности |

## Использование

### Создание лога

```typescript
await this.logsPort.createLog(
  new LogsCommands.CreateLogCommand({
    entityType: LogsEnums.LogEntityType.ORDER,
    entityId: orderId,
    text: 'Заказ принят в работу',
    logLevel: LogsEnums.LogLevel.MEDIUM,
    forRoles: [UserType.SELLER, UserType.ADMIN],
  })
);
```

### Получение логов

```typescript
const result = await this.logsPort.getEntityLogs(
  new LogsQueries.GetEntityLogsQuery(
    LogsEnums.LogEntityType.SHIFT,
    shiftId,
    [UserType.SELLER], // роли для фильтрации
    {
      level: LogsEnums.LogLevel.HIGH,
      fromDate: new Date('2024-01-01'),
      search: 'блокировка',
    }
  ),
  { pagination: { page: 1, pageSize: 20 } }
);
```

### Каскадное удаление

```typescript
await this.logsPort.deleteAllEntityLogs(
  new LogsCommands.DeleteAllEntityLogsCommand(
    LogsEnums.LogEntityType.SHOP,
    shopId
  ),
  { session }
);
```

## Особенности

### Фильтрация по ролям

```typescript
// Лог виден только админам
forRoles: [UserType.ADMIN]

// Лог виден продавцу и админу
forRoles: [UserType.SELLER, UserType.ADMIN]
```

При запросе `getEntityLogs` фильтрует по `forRoles: { $in: requestedRoles }`.

### Индексы

```typescript
LogSchema.index({ entityType: 1, entity: 1, createdAt: -1 });
LogSchema.index({ logLevel: 1, createdAt: -1 });
LogSchema.index({ forRoles: 1 });
```

### Виртуалы

```typescript
LogSchema.virtual('logId').get(function() {
  return this._id?.toString();
});
```

## Best Practices

```typescript
// ✅ Критичные операции — HIGH/CRITICAL
await logsPort.createLog(
  new LogsCommands.CreateLogCommand({
    entityType: LogEntityType.ORDER,
    entityId: orderId,
    text: 'Возврат средств клиенту',
    logLevel: LogLevel.CRITICAL,
    forRoles: [UserType.ADMIN],
  })
);

// ✅ Каскадное удаление при удалении сущности
await logsPort.deleteAllEntityLogs(
  new LogsCommands.DeleteAllEntityLogsCommand(entityType, entityId),
  { session }
);

// ✅ Добавляйте роли для видимости
forRoles: [UserType.ADMIN, UserType.SELLER]

// ✅ Используйте пагинацию
await logsPort.getEntityLogs(query, { pagination: { page: 1, pageSize: 50 } })
```

## Рекомендации по уровням

| Уровень | Когда использовать |
|---------|-------------------|
| `LOW` | Информационные события |
| `MEDIUM` | Обычные бизнес-операции |
| `HIGH` | Важные изменения статусов |
| `CRITICAL` | Блокировки, возвраты, нарушения |
