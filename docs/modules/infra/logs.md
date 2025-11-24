# Logs Infrastructure Module

> **Модуль:** `src/infra/logs`  
> **Назначение:** Аудит-логирование действий пользователей и системных событий

---

## 1. Обзор

Централизованная система логирования для отслеживания действий пользователей и критичных событий в системе.

**Основные возможности:**
- Логирование действий пользователей (Customer, Seller, Employee, Admin)
- Привязка логов к сущностям (Order, Shop, Product и т.д.)
- Уровни важности логов (LOW, MEDIUM, HIGH, CRITICAL)
- Фильтрация логов по ролям (кто может видеть)
- Пагинация и поиск логов
- Автоматическое удаление устаревших логов

**Использование:**
- Аудит действий администраторов
- История изменений заказов
- Логи смен сотрудников
- Финансовые транзакции
- Верификация продавцов/магазинов

---

## 2. Схема данных

### Log Schema

```typescript
{
  _id: ObjectId,
  
  // Привязка к сущности
  entityType: LogEntityType,  // CUSTOMER | ORDER | SHOP | PRODUCT и т.д.
  entity: ObjectId,           // ID сущности
  
  // Контроль доступа
  forRoles: UserType[],       // Кто может видеть логи (default: [ADMIN])
  
  // Важность
  logLevel: LogLevel,         // LOW | MEDIUM | HIGH | CRITICAL
  
  // Содержание
  text: string,               // Текст лога
  
  createdAt: Date,
  updatedAt: Date
}
```

**Виртуальные поля:**
```typescript
logId: string  // Строковый ID (_id.toString())
```

**Индексы:**
```typescript
{ entityType: 1, entity: 1, createdAt: -1 }  // Логи сущности
{ logLevel: 1, createdAt: -1 }               // Критичные логи
{ forRoles: 1 }                              // Доступ по ролям
```

---

## 3. Енумы

### LogLevel

Уровни важности логов:

```typescript
enum LogLevel {
  LOW = 'low',          // Информационные (просмотр, чтение)
  MEDIUM = 'medium',    // Обновления, изменения
  HIGH = 'high',        // Критичные действия (удаление, блокировка)
  CRITICAL = 'critical' // Системные ошибки, fraud detection
}
```

**Использование:**
- `LOW` - "Продавец просмотрел заказ #123"
- `MEDIUM` - "Сотрудник обновил остатки товара"
- `HIGH` - "Админ заблокировал магазин #456"
- `CRITICAL` - "Обнаружена попытка мошенничества"

### LogEntityType

Типы сущностей для логирования:

```typescript
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
  SELLER_ACCOUNT = 'SellerAccount'
}
```

---

## 4. Commands (Write операции)

### CreateLogCommand

Создание нового лога:

```typescript
class CreateLogCommand {
  payload: {
    entityType: LogEntityType,
    entity: string,            // ID сущности
    forRoles?: UserType[],     // default: [ADMIN]
    logLevel?: LogLevel,       // default: LOW
    text: string
  }
}
```

**Пример:**
```typescript
await logsPort.createLog(
  new CreateLogCommand({
    entityType: LogEntityType.ORDER,
    entity: orderId,
    forRoles: [UserType.ADMIN, UserType.SELLER],
    logLevel: LogLevel.MEDIUM,
    text: 'Заказ принят в работу сотрудником Иван Иванов'
  })
);
```

### DeleteAllEntityLogsCommand

Удаление всех логов сущности:

```typescript
class DeleteAllEntityLogsCommand {
  entityType: LogEntityType,
  entity: string
}
```

**Использование:** при удалении сущности (каскадное удаление).

---

## 5. Queries (Read операции)

### GetEntityLogsQuery

Получение логов конкретной сущности:

```typescript
class GetEntityLogsQuery {
  entityType: LogEntityType,
  entity: string,
  logLevel?: LogLevel,  // Фильтр по уровню
  page?: number,
  limit?: number
}
```

**Возвращает:** `PaginateResult<Log>`

**Пример:**
```typescript
const logs = await logsPort.getEntityLogs({
  entityType: LogEntityType.ORDER,
  entity: orderId,
  page: 1,
  limit: 20
});

// logs.docs - массив логов
// logs.totalDocs - общее количество
// logs.page, logs.totalPages - пагинация
```

---

## 6. Port (Интерфейс)

```typescript
interface LogsPort {
  // Queries
  getEntityLogs(query: GetEntityLogsQuery): Promise<PaginateResult<Log>>;
  getLog(logId: string): Promise<Log | null>;
  
  // Commands
  createLog(command: CreateLogCommand): Promise<Log>;
  deleteLog(logId: string): Promise<void>;
  deleteAllEntityLogs(command: DeleteAllEntityLogsCommand): Promise<void>;
}

const LOGS_PORT = Symbol('LOGS_PORT');
```

---

## 7. Service (Бизнес-логика)

### LogsService

**Основные методы:**

#### `createLog(command)`

```typescript
async createLog(command: CreateLogCommand): Promise<Log> {
  const log = await this.logModel.create({
    entityType: command.payload.entityType,
    entity: command.payload.entity,
    forRoles: command.payload.forRoles || [UserType.ADMIN],
    logLevel: command.payload.logLevel || LogLevel.LOW,
    text: command.payload.text
  });
  
  // Emit event для real-time уведомлений
  this.eventEmitter.emit('log.created', {
    log,
    entityType: log.entityType,
    entity: log.entity,
    logLevel: log.logLevel
  });
  
  return log;
}
```

#### `getEntityLogs(query)`

```typescript
async getEntityLogs(query: GetEntityLogsQuery): Promise<PaginateResult<Log>> {
  const filter: any = {
    entityType: query.entityType,
    entity: new Types.ObjectId(query.entity)
  };
  
  if (query.logLevel) {
    filter.logLevel = query.logLevel;
  }
  
  const result = await this.logModel.paginate(filter, {
    page: query.page || 1,
    limit: query.limit || 20,
    sort: { createdAt: -1 }  // Новые первыми
  });
  
  return result;
}
```

---

## 8. Использование

### Логирование действий в доменном модуле

```typescript
import { LogsPort, LOGS_PORT } from 'src/infra/logs';
import { LogEntityType, LogLevel } from 'src/infra/logs/logs.enums';

@Injectable()
export class OrderService {
  constructor(
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) {}

  async acceptOrder(orderId: string, employeeId: string) {
    // Принятие заказа
    await this.orderModel.updateOne(
      { _id: orderId },
      { status: OrderStatus.ACCEPTED }
    );
    
    // Логирование
    await this.logsPort.createLog(
      new CreateLogCommand({
        entityType: LogEntityType.ORDER,
        entity: orderId,
        forRoles: [UserType.ADMIN, UserType.SELLER, UserType.EMPLOYEE],
        logLevel: LogLevel.MEDIUM,
        text: `Заказ принят в работу сотрудником ${employeeId}`
      })
    );
  }
}
```

### Просмотр истории заказа

```typescript
@Injectable()
export class SellerOrdersRoleService {
  constructor(
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) {}

  async getOrderHistory(orderId: string) {
    const logs = await this.logsPort.getEntityLogs({
      entityType: LogEntityType.ORDER,
      entity: orderId,
      page: 1,
      limit: 50
    });
    
    return logs.docs.map(log => ({
      time: log.createdAt,
      action: log.text,
      level: log.logLevel
    }));
  }
}
```

### HTTP Controller

```typescript
@Controller('logs')
export class LogsController {
  constructor(
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) {}

  @Get('entity/:type/:id')
  async getEntityLogs(
    @Param('type') type: LogEntityType,
    @Param('id') id: string,
    @Query() query: { page?: number, limit?: number }
  ) {
    return await this.logsPort.getEntityLogs({
      entityType: type,
      entity: id,
      ...query
    });
  }

  @Get(':id')
  async getLog(@Param('id') id: string) {
    const log = await this.logsPort.getLog(id);
    if (!log) {
      throw new NotFoundException('Лог не найден');
    }
    return log;
  }
}
```

---

## 9. Events

### LogCreatedEvent

Событие при создании лога:

```typescript
{
  log: Log,
  entityType: LogEntityType,
  entity: ObjectId,
  logLevel: LogLevel
}
```

**Подписка:**
```typescript
@OnEvent('log.created')
handleLogCreated(event: LogCreatedEvent) {
  if (event.logLevel === LogLevel.CRITICAL) {
    // Отправить уведомление админам
    this.notificationPort.send({
      userId: ADMIN_ID,
      type: NotificationType.CRITICAL_LOG,
      channels: [NotificationChannel.TELEGRAM],
      payload: { logId: event.log._id, text: event.log.text }
    });
  }
}
```

---

## 10. Best Practices

### 1. Используйте правильные уровни

```typescript
// ✅ Хорошо
createLog({ logLevel: LogLevel.LOW, text: 'Просмотр товара' });
createLog({ logLevel: LogLevel.MEDIUM, text: 'Обновление цены' });
createLog({ logLevel: LogLevel.HIGH, text: 'Удаление товара' });
createLog({ logLevel: LogLevel.CRITICAL, text: 'Обнаружена попытка взлома' });

// ❌ Плохо
createLog({ logLevel: LogLevel.CRITICAL, text: 'Просмотр товара' });
```

### 2. Указывайте роли для доступа

```typescript
// ✅ Хорошо - продавец может видеть логи своего магазина
createLog({
  forRoles: [UserType.ADMIN, UserType.SELLER],
  text: 'Магазин обновлён'
});

// ❌ Плохо - только админ (default)
createLog({
  text: 'Магазин обновлён'
});
```

### 3. Логируйте критичные действия

```typescript
// Всегда логировать:
- Финансовые операции (выплаты, возвраты)
- Блокировки/разблокировки
- Изменения статусов заказов
- Верификацию
- Действия администраторов
```

### 4. Каскадное удаление

```typescript
// При удалении сущности - удалить её логи
async deleteShop(shopId: string) {
  await this.shopModel.deleteOne({ _id: shopId });
  
  await this.logsPort.deleteAllEntityLogs(
    new DeleteAllEntityLogsCommand({
      entityType: LogEntityType.SHOP,
      entity: shopId
    })
  );
}
```

---

## Производительность

### Индексы

Правильные индексы критичны для производительности:

```typescript
// Основной индекс для getEntityLogs
{ entityType: 1, entity: 1, createdAt: -1 }

// Поиск критичных логов
{ logLevel: 1, createdAt: -1 }

// Фильтрация по ролям
{ forRoles: 1 }
```

### TTL (Time To Live)

Рекомендуется настроить автоудаление старых логов:

```typescript
// Удаление логов старше 90 дней
LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
```

### Pagination

Всегда используйте пагинацию для больших списков:

```typescript
// ✅ Хорошо
const logs = await logsPort.getEntityLogs({
  entityType: LogEntityType.ORDER,
  entity: orderId,
  page: 1,
  limit: 20
});

// ❌ Плохо - может вернуть тысячи логов
const logs = await logModel.find({ entity: orderId });
```

---

## Примеры

### Логирование смены

```typescript
// Открытие смены
await logsPort.createLog({
  entityType: LogEntityType.SHIFT,
  entity: shiftId,
  forRoles: [UserType.ADMIN, UserType.SELLER, UserType.EMPLOYEE],
  logLevel: LogLevel.LOW,
  text: `Смена открыта сотрудником ${employee.name}`
});

// Закрытие смены
await logsPort.createLog({
  entityType: LogEntityType.SHIFT,
  entity: shiftId,
  forRoles: [UserType.ADMIN, UserType.SELLER],
  logLevel: LogLevel.MEDIUM,
  text: `Смена закрыта. Выручка: ${shift.revenue}₽, Заказов: ${shift.ordersCount}`
});
```

### Логирование финансовых операций

```typescript
// Выплата продавцу
await logsPort.createLog({
  entityType: LogEntityType.SELLER_ACCOUNT,
  entity: sellerAccountId,
  forRoles: [UserType.ADMIN],
  logLevel: LogLevel.HIGH,
  text: `Выплата ${amount}₽ на счёт ${bankAccount}. Админ: ${adminId}`
});
```

### История изменений товара

```typescript
const history = await logsPort.getEntityLogs({
  entityType: LogEntityType.PRODUCT,
  entity: productId,
  page: 1,
  limit: 10
});

console.log(history.docs);
// [
//   { text: 'Цена изменена с 250₽ на 300₽', createdAt: '2024-11-24...' },
//   { text: 'Добавлено изображение', createdAt: '2024-11-23...' },
//   { text: 'Товар создан', createdAt: '2024-11-20...' }
// ]
```

---

## Заключение

Logs Module предоставляет централизованную систему аудит-логирования для отслеживания всех действий в системе. Модуль критичен для безопасности, отладки и соответствия требованиям аудита.

**Ключевые особенности:**
- Привязка к сущностям
- Уровни важности
- Контроль доступа по ролям
- Event-driven architecture
- Production-ready (индексы, TTL, pagination)
