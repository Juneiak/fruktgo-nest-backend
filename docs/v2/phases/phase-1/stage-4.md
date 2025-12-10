# Этап 1.4: INVENTORY (Склад)

## Краткое содержание

Модуль управления остатками товаров. Stock (остатки), Reserve (брони), StockMovement (история). Optimistic Concurrency Control (OCC) для производительности.

## Предполагаемый результат

- Остатки по SKU/магазину ведутся
- Резервирование при checkout работает
- OCC через version предотвращает race conditions
- История движений записывается
- Синхронизация со STOREFRONT работает

---

## 1. Структура модуля

```
src/modules/inventory/
├── index.ts
├── inventory.module.ts
├── stock/
│   ├── stock.port.ts
│   ├── stock.service.ts
│   ├── stock.schema.ts
│   ├── stock.commands.ts
│   ├── stock.queries.ts
│   └── stock.enums.ts
├── reserve/
│   ├── reserve.port.ts
│   ├── reserve.service.ts
│   ├── reserve.schema.ts
│   └── reserve.commands.ts
└── movement/
    ├── movement.schema.ts
    └── movement.types.ts
```

---

## 2. Stock Enums

```typescript
// src/modules/inventory/stock/stock.enums.ts

export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',      // Ниже минимума
  OUT_OF_STOCK = 'out_of_stock',
}

export enum MovementType {
  RECEIVE = 'receive',           // Приёмка
  RESERVE = 'reserve',           // Резервирование под заказ
  RELEASE_RESERVE = 'release_reserve', // Отмена резерва
  SELL = 'sell',                 // Продажа (списание)
  WRITEOFF = 'writeoff',         // Списание (порча, истёк срок)
  ADJUSTMENT = 'adjustment',     // Корректировка инвентаризации
  RETURN = 'return',             // Возврат от клиента
}
```

---

## 3. Stock Schema

```typescript
// src/modules/inventory/stock/stock.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { City } from 'src/common';
import { StockStatus } from './stock.enums';

@Schema({
  timestamps: true,
  collection: 'stocks',
  toJSON: { virtuals: true },
  optimisticConcurrency: true, // Mongoose OCC
})
export class Stock {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopProductId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  productId: Types.ObjectId;

  // Денормализация
  @Prop({ type: String, enum: City, required: true, index: true })
  city: City;

  // Количества
  @Prop({ type: Number, required: true, default: 0 })
  quantity: number; // Всего на складе

  @Prop({ type: Number, default: 0 })
  reserved: number; // Зарезервировано под заказы

  @Prop({ type: Number, default: 0 })
  available: number; // = quantity - reserved (вычисляется)

  // Пороги
  @Prop({ type: Number, default: 5 })
  lowStockThreshold: number;

  @Prop({ type: String, enum: StockStatus, default: StockStatus.IN_STOCK })
  status: StockStatus;

  // OCC версия (автоматически через optimisticConcurrency)
  __v: number;

  // Виртуальные
  stockId: string;
}

export type StockDocument = Stock & Document;
export const StockSchema = SchemaFactory.createForClass(Stock);

StockSchema.virtual('stockId').get(function () {
  return this._id.toHexString();
});

// Вычисление available перед сохранением
StockSchema.pre('save', function () {
  this.available = this.quantity - this.reserved;
  
  // Обновление статуса
  if (this.available <= 0) {
    this.status = StockStatus.OUT_OF_STOCK;
  } else if (this.available <= this.lowStockThreshold) {
    this.status = StockStatus.LOW_STOCK;
  } else {
    this.status = StockStatus.IN_STOCK;
  }
});

// Уникальный индекс
StockSchema.index({ shopId: 1, shopProductId: 1 }, { unique: true });
StockSchema.index({ city: 1, status: 1 });
```

---

## 4. Reserve Schema

```typescript
// src/modules/inventory/reserve/reserve.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ReserveStatus {
  ACTIVE = 'active',
  FULFILLED = 'fulfilled',  // Списано при доставке
  RELEASED = 'released',    // Отменено
  EXPIRED = 'expired',
}

@Schema({
  timestamps: true,
  collection: 'reserves',
  toJSON: { virtuals: true },
})
export class Reserve {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  stockId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  shopProductId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, enum: ReserveStatus, default: ReserveStatus.ACTIVE })
  status: ReserveStatus;

  @Prop({ type: Date, required: true })
  expiresAt: Date; // Автоотмена если заказ не оплачен

  reserveId: string;
}

export type ReserveDocument = Reserve & Document;
export const ReserveSchema = SchemaFactory.createForClass(Reserve);

ReserveSchema.virtual('reserveId').get(function () {
  return this._id.toHexString();
});

// TTL индекс для автоочистки expired
ReserveSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ReserveSchema.index({ orderId: 1 });
ReserveSchema.index({ stockId: 1, status: 1 });
```

---

## 5. StockMovement Schema

```typescript
// src/modules/inventory/movement/movement.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MovementType } from '../stock/stock.enums';

@Schema({
  timestamps: true,
  collection: 'stock_movements',
})
export class StockMovement {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  stockId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  shopProductId: Types.ObjectId;

  @Prop({ type: String, enum: MovementType, required: true })
  type: MovementType;

  @Prop({ type: Number, required: true })
  quantity: number; // + или -

  @Prop({ type: Number, required: true })
  quantityBefore: number;

  @Prop({ type: Number, required: true })
  quantityAfter: number;

  @Prop({ type: Types.ObjectId })
  orderId?: Types.ObjectId; // Для RESERVE, SELL

  @Prop({ type: Types.ObjectId })
  reserveId?: Types.ObjectId;

  @Prop({ type: String })
  reason?: string; // Для WRITEOFF, ADJUSTMENT

  @Prop({ type: String, required: true })
  performedBy: string; // userId или system

  @Prop({ type: String })
  performedByType: string; // employee, seller, system
}

export type StockMovementDocument = StockMovement & Document;
export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

StockMovementSchema.index({ stockId: 1, createdAt: -1 });
StockMovementSchema.index({ shopId: 1, createdAt: -1 });
StockMovementSchema.index({ orderId: 1 });
```

---

## 6. Stock Port

```typescript
// src/modules/inventory/stock/stock.port.ts
import * as StockCommands from './stock.commands';
import * as StockQueries from './stock.queries';
import { Stock } from './stock.schema';

export const STOCK_PORT = Symbol('STOCK_PORT');

export interface StockPort {
  // Commands
  receive(command: StockCommands.ReceiveCommand): Promise<Stock>;
  reserve(command: StockCommands.ReserveCommand): Promise<ReserveResult>;
  releaseReserve(command: StockCommands.ReleaseReserveCommand): Promise<Stock>;
  fulfillReserve(command: StockCommands.FulfillReserveCommand): Promise<Stock>;
  writeoff(command: StockCommands.WriteoffCommand): Promise<Stock>;
  adjust(command: StockCommands.AdjustCommand): Promise<Stock>;

  // Queries
  getById(query: StockQueries.GetByIdQuery): Promise<Stock>;
  getByShopProduct(query: StockQueries.GetByShopProductQuery): Promise<Stock | null>;
  getByShop(query: StockQueries.GetByShopQuery): Promise<Stock[]>;
  getAvailability(query: StockQueries.GetAvailabilityQuery): Promise<AvailabilityResult>;
  getLowStock(query: StockQueries.GetLowStockQuery): Promise<Stock[]>;
}

export interface ReserveResult {
  reserve: Reserve;
  stock: Stock;
}

export interface AvailabilityResult {
  shopProductId: string;
  available: number;
  canReserve: boolean;
}
```

---

## 7. Stock Commands

```typescript
// src/modules/inventory/stock/stock.commands.ts
import { CommonCommandOptions, City } from 'src/common';
import { MovementType } from './stock.enums';

export class ReceiveCommand {
  constructor(
    public readonly data: {
      shopId: string;
      shopProductId: string;
      productId: string;
      city: City;
      quantity: number;
      performedBy: string;
      performedByType: string;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class ReserveCommand {
  constructor(
    public readonly data: {
      shopProductId: string;
      orderId: string;
      quantity: number;
      expiresAt: Date;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class ReleaseReserveCommand {
  constructor(
    public readonly reserveId: string,
    public readonly reason: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class FulfillReserveCommand {
  constructor(
    public readonly reserveId: string,
    public readonly actualQuantity: number, // Может отличаться (недовес)
    public readonly performedBy: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class WriteoffCommand {
  constructor(
    public readonly stockId: string,
    public readonly quantity: number,
    public readonly reason: string,
    public readonly performedBy: string,
    public readonly performedByType: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class AdjustCommand {
  constructor(
    public readonly stockId: string,
    public readonly newQuantity: number,
    public readonly reason: string,
    public readonly performedBy: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}
```

---

## 8. OCC Implementation

```typescript
// src/modules/inventory/stock/stock.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Stock, StockDocument } from './stock.schema';
import { StockMovement, StockMovementDocument } from '../movement/movement.schema';
import { Reserve, ReserveDocument, ReserveStatus } from '../reserve/reserve.schema';
import { EVENT_BUS_PORT, EventBusPort } from 'src/infra/event-bus';
import { DomainError } from 'src/common';
import * as StockCommands from './stock.commands';

@Injectable()
export class StockService implements StockPort {
  private readonly MAX_RETRIES = 3;

  constructor(
    @InjectModel(Stock.name) private stockModel: Model<StockDocument>,
    @InjectModel(StockMovement.name) private movementModel: Model<StockMovementDocument>,
    @InjectModel(Reserve.name) private reserveModel: Model<ReserveDocument>,
    @Inject(EVENT_BUS_PORT) private eventBus: EventBusPort,
  ) {}

  async reserve(command: StockCommands.ReserveCommand): Promise<ReserveResult> {
    const { shopProductId, orderId, quantity, expiresAt } = command.data;
    const session = command.options?.session;

    // OCC с retry
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const stock = await this.stockModel.findOne({ shopProductId }).session(session);
      
      if (!stock) {
        throw DomainError.notFound('Stock', shopProductId);
      }

      if (stock.available < quantity) {
        throw DomainError.invariant('Insufficient stock', {
          available: stock.available,
          requested: quantity,
        });
      }

      // Атомарное обновление с проверкой версии
      const result = await this.stockModel.findOneAndUpdate(
        {
          _id: stock._id,
          __v: stock.__v, // OCC check
          available: { $gte: quantity },
        },
        {
          $inc: { reserved: quantity },
          $set: { available: stock.quantity - stock.reserved - quantity },
        },
        { new: true, session },
      );

      if (!result) {
        // Версия изменилась или недостаточно остатков — retry
        if (attempt === this.MAX_RETRIES - 1) {
          throw new ConflictException('Stock updated concurrently, please retry');
        }
        continue;
      }

      // Создаём резерв
      const reserve = await this.reserveModel.create([{
        stockId: stock._id,
        orderId,
        shopProductId,
        quantity,
        expiresAt,
        status: ReserveStatus.ACTIVE,
      }], { session });

      // Записываем движение
      await this.movementModel.create([{
        stockId: stock._id,
        shopId: stock.shopId,
        shopProductId,
        type: MovementType.RESERVE,
        quantity: -quantity,
        quantityBefore: stock.available,
        quantityAfter: result.available,
        orderId,
        reserveId: reserve[0]._id,
        performedBy: 'system',
        performedByType: 'system',
      }], { session });

      // Событие для STOREFRONT
      await this.eventBus.emit('stock.reserved', {
        shopProductId,
        available: result.available,
      });

      return { reserve: reserve[0], stock: result };
    }

    throw new ConflictException('Failed to reserve stock after retries');
  }

  async fulfillReserve(command: StockCommands.FulfillReserveCommand): Promise<Stock> {
    const { reserveId, actualQuantity, performedBy } = command;
    const session = command.options?.session;

    const reserve = await this.reserveModel.findById(reserveId).session(session);
    if (!reserve || reserve.status !== ReserveStatus.ACTIVE) {
      throw DomainError.notFound('Reserve', reserveId);
    }

    // Разница между зарезервированным и фактическим (недовес/перевес)
    const diff = reserve.quantity - actualQuantity;

    // Обновляем stock
    const stock = await this.stockModel.findByIdAndUpdate(
      reserve.stockId,
      {
        $inc: {
          quantity: -actualQuantity, // Списываем фактическое
          reserved: -reserve.quantity, // Освобождаем резерв
        },
      },
      { new: true, session },
    );

    // Обновляем резерв
    await this.reserveModel.updateOne(
      { _id: reserveId },
      { status: ReserveStatus.FULFILLED },
      { session },
    );

    // Записываем движение
    await this.movementModel.create([{
      stockId: reserve.stockId,
      shopId: stock.shopId,
      shopProductId: reserve.shopProductId,
      type: MovementType.SELL,
      quantity: -actualQuantity,
      quantityBefore: stock.quantity + actualQuantity,
      quantityAfter: stock.quantity,
      orderId: reserve.orderId,
      reserveId,
      performedBy,
      performedByType: 'employee',
    }], { session });

    // Событие для STOREFRONT
    await this.eventBus.emit('stock.sold', {
      shopProductId: reserve.shopProductId.toString(),
      available: stock.available,
    });

    return stock;
  }

  // ... остальные методы
}
```

---

## 9. Взаимодействие с другими модулями

| Модуль | Направление | Описание |
|--------|-------------|----------|
| STOREFRONT | → | Синхронизация stockQuantity через события |
| ORDERS | ← | Резервирование при checkout, списание при доставке |
| BUSINESS | ← | Привязка к Shop |
| CATALOG | ← | Привязка к Product |

---

## 10. Events

```typescript
// src/modules/inventory/inventory.events.ts

export const INVENTORY_EVENTS = {
  STOCK_RECEIVED: 'stock.received',
  STOCK_RESERVED: 'stock.reserved',
  STOCK_RELEASED: 'stock.released',
  STOCK_SOLD: 'stock.sold',
  STOCK_LOW: 'stock.low',
  STOCK_OUT: 'stock.out',
} as const;

export interface StockChangedEvent {
  shopProductId: string;
  stockId: string;
  available: number;
  status: StockStatus;
}
```

---

## 11. Endpoints

```
# Seller
GET    /seller/shops/:shopId/stock
POST   /seller/shops/:shopId/stock/receive
POST   /seller/shops/:shopId/stock/writeoff
POST   /seller/shops/:shopId/stock/adjust
GET    /seller/shops/:shopId/stock/low
GET    /seller/shops/:shopId/stock/movements
```

---

## Чеклист готовности

- [ ] Stock CRUD работает
- [ ] Резервирование с OCC работает
- [ ] Retry при конфликтах работает
- [ ] StockMovement записывается
- [ ] Events для STOREFRONT отправляются
- [ ] Low stock alerts генерируются
