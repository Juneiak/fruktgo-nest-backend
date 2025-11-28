# Logs Infrastructure Module

Централизованный аудит‑лог, который фиксирует действия пользователей и системные события. Реализует `LogsPort` и предоставляет пагинируемые выборки по сущностям.

## 1. Обзор

- хранит логи по сущностям (Order, Shop, Shift, Accounts и т.д.);
- поддерживает уровни серьёзности (`LogLevel`) и список ролей, которым доступен лог (`forRoles`);
- предоставляет команды на создание/удаление, запросы на получение одного лога или списка с фильтрами;
- логика сосредоточена в инфраструктурном слое (Mongo + Mongoose), вызывающие сервисы отвечают за бизнес‑контекст.

## 2. Схема данных

```typescript
@Schema({ toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true })
export class Log {
  @Prop({ enum: LogEntityType, required: true }) entityType: LogEntityType;
  @Prop({ type: Types.ObjectId, refPath: 'entityType', required: true }) entity: Types.ObjectId;
  @Prop({ type: [String], enum: Object.values(UserType), default: () => [UserType.ADMIN] }) forRoles: UserType[];
  @Prop({ enum: LogLevel, default: LogLevel.LOW }) logLevel: LogLevel;
  @Prop({ type: String, required: true }) text: string;
}

LogSchema.virtual('logId').get(function () { return this._id.toString(); });
LogSchema.index({ entityType: 1, entity: 1, createdAt: -1 });
LogSchema.index({ logLevel: 1, createdAt: -1 });
LogSchema.index({ forRoles: 1 });
```

## 3. Енумы

```typescript
export enum LogLevel { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', CRITICAL = 'critical' }

export enum LogEntityType {
  CUSTOMER = 'Customer', EMPLOYEE = 'Employee', ORDER = 'Order', PRODUCT = 'Product',
  SELLER = 'Seller', SHIFT = 'Shift', SHOP_PRODUCT = 'ShopProduct', SHOP = 'Shop',
  SHOP_ACCOUNT = 'ShopAccount', SELLER_ACCOUNT = 'SellerAccount',
}
```

## 4. Commands

```typescript
new CreateLogCommand({
  entityType, entityId, text,
  logLevel?: LogLevel,
  forRoles?: UserType[],
}, logId?);

new DeleteAllEntityLogsCommand(entityType, entityId);
```

`logId` опционален: можно задавать заранее (например, при миграциях). По умолчанию к `forRoles` добавляется `UserType.ADMIN`.

## 5. Queries

```typescript
new GetEntityLogsQuery(entityType, entityId, forRoles, {
  level?: LogLevel | LogLevel[],
  fromDate?: Date,
  toDate?: Date,
  search?: string,
});
```

`LogsService` использует `mongoose-paginate-v2`, поэтому результат — `PaginateResult<Log>`. Фильтр `forRoles` автоматически ограничивает видимость по ролям вызывающего пользователя.

## 6. Port

```typescript
export interface LogsPort {
  getEntityLogs(query: GetEntityLogsQuery, options?): Promise<PaginateResult<Log>>;
  getLog(logId: string, options?): Promise<Log | null>;

  createLog(command: CreateLogCommand, options?): Promise<Log>;
  deleteLog(logId: string, options?): Promise<void>;
  deleteAllEntityLogs(command: DeleteAllEntityLogsCommand, options?): Promise<void>;
}

export const LOGS_PORT = Symbol('LOGS_PORT');
```

## 7. Service

Особенности `LogsService`:

1. **Проверка ID.** Все методы вызывают `checkId`, чтобы исключить `CastError`.
2. **Фильтрация по ролям.** `getEntityLogs` принимает массив ролей и строит `$in` фильтр (`forRoles: { $in: roles }`).
3. **Поиск и период.** Поддерживает текстовый поиск (`text` с `$regex`) и интервал по `createdAt`.
4. **Удаление.** `deleteLog` поднимает `DomainError.notFound`, если документ отсутствует; `deleteAllEntityLogs` используется для каскадного удаления.
5. **Сессии.** Все команды/запросы принимают `CommonCommandOptions`/`CommonListQueryOptions` и уважают `session`/`pagination`/`sort`.

## 8. Использование

```typescript
@Injectable()
export class SellerShiftsRoleService {
  constructor(
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
    @Inject(ACCESS_PORT) private readonly accessPort: AccessPort,
  ) {}

  async getShiftLogs(authedSeller: AuthenticatedUser, shiftId: string, pagination: PaginationQueryDto) {
    const hasAccess = await this.accessPort.canSellerAccessShift(authedSeller.id, shiftId);
    if (!hasAccess) throw new NotFoundException('Смена не найдена или недоступна');

    const result = await this.logsPort.getEntityLogs(
      new LogsQueries.GetEntityLogsQuery(
        LogEntityType.SHIFT,
        shiftId,
        [UserType.SELLER],
      ),
      { pagination },
    );

    return transformPaginatedResult(result, LogResponseDto);
  }
}

// При удалении магазина
await this.logsPort.deleteAllEntityLogs(
  new LogsCommands.DeleteAllEntityLogsCommand(LogEntityType.SHOP, shopId),
  { session },
);
```

## 9. Best Practices

1. **Добавляйте роли.** Если лог должен быть виден продавцу/сотруднику, передавайте `forRoles` при создании (`[UserType.ADMIN, UserType.SELLER]`).
2. **Логируйте критичные операции.** Блокировки, изменения статусов заказов, выплаты и возвраты всегда сопровождайте `LogLevel.HIGH/CRITICAL`.
3. **Удаление сущностей — удаление логов.** При каскадном удалении вызывайте `DeleteAllEntityLogsCommand` в той же транзакции.
4. **Используйте пагинацию.** Не запрашивайте `logModel.find` напрямую — только `LogsPort.getEntityLogs` с лимитом и сортировкой.

