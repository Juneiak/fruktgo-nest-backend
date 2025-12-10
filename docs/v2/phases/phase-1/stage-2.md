# Этап 1.2: CUSTOMER & BUSINESS

## Краткое содержание

Два ключевых модуля пользователей: CUSTOMER (покупатели) и BUSINESS (селлеры, магазины). Профили, адреса доставки, настройки магазинов.

## Предполагаемый результат

- Покупатели могут регистрироваться и управлять профилем
- Адреса доставки с city работают
- Селлеры и магазины создаются и настраиваются
- Интеграция с AUTH модулем

---

# CUSTOMER

## 1. Структура модуля

```
src/modules/customer/
├── index.ts
├── customer.module.ts
├── customer.port.ts
├── customer.service.ts
├── customer.schema.ts
├── customer.commands.ts
├── customer.queries.ts
├── customer.enums.ts
└── customer.events.ts
```

---

## 2. Enums

```typescript
// src/modules/customer/customer.enums.ts

export enum CustomerStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  DELETED = 'deleted',
}

export enum CustomerSex {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}
```

---

## 3. Schema

```typescript
// src/modules/customer/customer.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { City } from 'src/common';
import { CustomerStatus, CustomerSex } from './customer.enums';

// === Подсхемы ===

@Schema({ _id: false })
export class CustomerAddress {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  label: string; // "Дом", "Работа"

  @Prop({ type: String, enum: City, required: true })
  city: City;

  @Prop({ type: String, required: true })
  street: string;

  @Prop({ type: String })
  building: string;

  @Prop({ type: String })
  apartment: string;

  @Prop({ type: String })
  entrance: string;

  @Prop({ type: String })
  floor: string;

  @Prop({ type: String })
  intercom: string;

  @Prop({ type: String })
  comment: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;
}

export const CustomerAddressSchema = SchemaFactory.createForClass(CustomerAddress);

@Schema({ _id: false })
export class CustomerStatistics {
  @Prop({ type: Number, default: 0 })
  totalOrders: number;

  @Prop({ type: Number, default: 0 })
  totalSpent: number; // в копейках

  @Prop({ type: Date })
  lastOrderAt: Date;
}

export const CustomerStatisticsSchema = SchemaFactory.createForClass(CustomerStatistics);

// === Основная схема ===

@Schema({
  timestamps: true,
  collection: 'customers',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Customer {
  @Prop({ type: String, unique: true, sparse: true })
  phone?: string;

  @Prop({ type: Number, unique: true, sparse: true })
  telegramId?: number;

  @Prop({ type: String })
  telegramUsername?: string;

  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  @Prop({ type: String, enum: CustomerSex })
  sex?: CustomerSex;

  @Prop({ type: Date })
  birthDate?: Date;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: [CustomerAddressSchema], default: [] })
  addresses: CustomerAddress[];

  @Prop({ type: String, enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  status: CustomerStatus;

  @Prop({ type: Number, default: 0 })
  bonusBalance: number; // копейки, для LOYALTY

  @Prop({ type: CustomerStatisticsSchema, default: () => ({}) })
  statistics: CustomerStatistics;

  @Prop({ type: String, enum: City })
  preferredCity?: City; // город по умолчанию

  // Виртуальные поля
  customerId: string;
  fullName: string;
}

export type CustomerDocument = Customer & Document;
export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Виртуальные поля
CustomerSchema.virtual('customerId').get(function () {
  return this._id.toHexString();
});

CustomerSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

// Индексы
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ telegramId: 1 });
CustomerSchema.index({ status: 1 });
CustomerSchema.index({ 'addresses.city': 1 });
CustomerSchema.index({ 'addresses.location': '2dsphere' });
```

---

## 4. Port

```typescript
// src/modules/customer/customer.port.ts
import * as CustomerCommands from './customer.commands';
import * as CustomerQueries from './customer.queries';
import { Customer } from './customer.schema';

export const CUSTOMER_PORT = Symbol('CUSTOMER_PORT');

export interface CustomerPort {
  // Commands
  create(command: CustomerCommands.CreateCommand): Promise<Customer>;
  update(command: CustomerCommands.UpdateCommand): Promise<Customer>;
  addAddress(command: CustomerCommands.AddAddressCommand): Promise<Customer>;
  updateAddress(command: CustomerCommands.UpdateAddressCommand): Promise<Customer>;
  removeAddress(command: CustomerCommands.RemoveAddressCommand): Promise<Customer>;
  setDefaultAddress(command: CustomerCommands.SetDefaultAddressCommand): Promise<Customer>;
  updateStatistics(command: CustomerCommands.UpdateStatisticsCommand): Promise<void>;
  updateBonusBalance(command: CustomerCommands.UpdateBonusBalanceCommand): Promise<Customer>;
  block(command: CustomerCommands.BlockCommand): Promise<Customer>;
  unblock(command: CustomerCommands.UnblockCommand): Promise<Customer>;

  // Queries
  getById(query: CustomerQueries.GetByIdQuery): Promise<Customer>;
  getByPhone(query: CustomerQueries.GetByPhoneQuery): Promise<Customer | null>;
  getByTelegramId(query: CustomerQueries.GetByTelegramIdQuery): Promise<Customer | null>;
  findOrCreate(query: CustomerQueries.FindOrCreateQuery): Promise<{ customer: Customer; isNew: boolean }>;
}
```

---

## 5. Commands

```typescript
// src/modules/customer/customer.commands.ts
import { CommonCommandOptions, City } from 'src/common';
import { CustomerSex } from './customer.enums';

export class CreateCommand {
  constructor(
    public readonly data: {
      phone?: string;
      telegramId?: number;
      telegramUsername?: string;
      firstName?: string;
      lastName?: string;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UpdateCommand {
  constructor(
    public readonly customerId: string,
    public readonly data: {
      firstName?: string;
      lastName?: string;
      sex?: CustomerSex;
      birthDate?: Date;
      email?: string;
      avatarUrl?: string;
      preferredCity?: City;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class AddAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly address: {
      label: string;
      city: City;
      street: string;
      building?: string;
      apartment?: string;
      entrance?: string;
      floor?: string;
      intercom?: string;
      comment?: string;
      coordinates: [number, number]; // [lng, lat]
      isDefault?: boolean;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UpdateAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly addressId: string,
    public readonly data: Partial<AddAddressCommand['address']>,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class RemoveAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly addressId: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class SetDefaultAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly addressId: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UpdateStatisticsCommand {
  constructor(
    public readonly customerId: string,
    public readonly data: {
      incrementOrders?: number;
      incrementSpent?: number; // копейки
      lastOrderAt?: Date;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UpdateBonusBalanceCommand {
  constructor(
    public readonly customerId: string,
    public readonly delta: number, // копейки, может быть отрицательным
    public readonly reason: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class BlockCommand {
  constructor(
    public readonly customerId: string,
    public readonly reason: string,
    public readonly blockedBy: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UnblockCommand {
  constructor(
    public readonly customerId: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}
```

---

## 6. Queries

```typescript
// src/modules/customer/customer.queries.ts
import { CommonQueryOptions } from 'src/common';

export class GetByIdQuery {
  constructor(
    public readonly customerId: string,
    public readonly options?: CommonQueryOptions,
  ) {}
}

export class GetByPhoneQuery {
  constructor(
    public readonly phone: string,
    public readonly options?: CommonQueryOptions,
  ) {}
}

export class GetByTelegramIdQuery {
  constructor(
    public readonly telegramId: number,
    public readonly options?: CommonQueryOptions,
  ) {}
}

export class FindOrCreateQuery {
  constructor(
    public readonly data: {
      phone?: string;
      telegramId?: number;
      telegramUsername?: string;
      firstName?: string;
    },
    public readonly options?: CommonQueryOptions,
  ) {}
}
```

---

## 7. Events

```typescript
// src/modules/customer/customer.events.ts

export const CUSTOMER_EVENTS = {
  CREATED: 'customer.created',
  UPDATED: 'customer.updated',
  BLOCKED: 'customer.blocked',
  ADDRESS_ADDED: 'customer.address_added',
  BONUS_CHANGED: 'customer.bonus_changed',
} as const;

export interface CustomerCreatedEvent {
  customerId: string;
  phone?: string;
  telegramId?: number;
}

export interface CustomerBonusChangedEvent {
  customerId: string;
  previousBalance: number;
  newBalance: number;
  delta: number;
  reason: string;
}
```

---

# BUSINESS

## 1. Структура модуля

```
src/modules/business/
├── index.ts
├── business.module.ts
├── seller/
│   ├── seller.port.ts
│   ├── seller.service.ts
│   ├── seller.schema.ts
│   ├── seller.commands.ts
│   ├── seller.queries.ts
│   └── seller.enums.ts
└── shop/
    ├── shop.port.ts
    ├── shop.service.ts
    ├── shop.schema.ts
    ├── shop.commands.ts
    ├── shop.queries.ts
    └── shop.enums.ts
```

---

## 2. Seller Enums

```typescript
// src/modules/business/seller/seller.enums.ts

export enum SellerStatus {
  PENDING = 'pending',       // Ожидает KYC
  ACTIVE = 'active',
  SUSPENDED = 'suspended',   // Приостановлен
  BLOCKED = 'blocked',
}

export enum SellerType {
  INDIVIDUAL = 'individual', // ИП
  COMPANY = 'company',       // ТОО/ООО
}
```

---

## 3. Seller Schema

```typescript
// src/modules/business/seller/seller.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SellerStatus, SellerType } from './seller.enums';

@Schema({ _id: false })
export class SellerBankDetails {
  @Prop({ type: String, required: true })
  bankName: string;

  @Prop({ type: String, required: true })
  bik: string;

  @Prop({ type: String, required: true })
  accountNumber: string;

  @Prop({ type: String })
  correspondentAccount?: string;
}

export const SellerBankDetailsSchema = SchemaFactory.createForClass(SellerBankDetails);

@Schema({ _id: false })
export class SellerStatistics {
  @Prop({ type: Number, default: 0 })
  totalShops: number;

  @Prop({ type: Number, default: 0 })
  totalOrders: number;

  @Prop({ type: Number, default: 0 })
  totalRevenue: number; // копейки
}

export const SellerStatisticsSchema = SchemaFactory.createForClass(SellerStatistics);

@Schema({
  timestamps: true,
  collection: 'sellers',
  toJSON: { virtuals: true },
})
export class Seller {
  @Prop({ type: String, unique: true, sparse: true })
  phone?: string;

  @Prop({ type: Number, unique: true, sparse: true })
  telegramId?: number;

  @Prop({ type: String })
  telegramUsername?: string;

  // Юридические данные
  @Prop({ type: String, enum: SellerType, required: true })
  type: SellerType;

  @Prop({ type: String, required: true })
  legalName: string; // Название юрлица

  @Prop({ type: String, required: true })
  bin: string; // БИН/ИИН

  @Prop({ type: String })
  legalAddress: string;

  @Prop({ type: String })
  contactPerson: string;

  @Prop({ type: String })
  contactEmail: string;

  @Prop({ type: SellerBankDetailsSchema })
  bankDetails?: SellerBankDetails;

  // Статус
  @Prop({ type: String, enum: SellerStatus, default: SellerStatus.PENDING })
  status: SellerStatus;

  @Prop({ type: String })
  blockReason?: string;

  @Prop({ type: SellerStatisticsSchema, default: () => ({}) })
  statistics: SellerStatistics;

  // Виртуальное
  sellerId: string;
}

export type SellerDocument = Seller & Document;
export const SellerSchema = SchemaFactory.createForClass(Seller);

SellerSchema.virtual('sellerId').get(function () {
  return this._id.toHexString();
});

// Индексы
SellerSchema.index({ phone: 1 });
SellerSchema.index({ telegramId: 1 });
SellerSchema.index({ bin: 1 }, { unique: true });
SellerSchema.index({ status: 1 });
```

---

## 4. Shop Enums

```typescript
// src/modules/business/shop/shop.enums.ts

export enum ShopStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',     // Селлер приостановил
  SUSPENDED = 'suspended', // Платформа приостановила
  CLOSED = 'closed',
}
```

---

## 5. Shop Schema

```typescript
// src/modules/business/shop/shop.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { City } from 'src/common';
import { ShopStatus } from './shop.enums';
import { Seller } from '../seller/seller.schema';

@Schema({ _id: false })
export class ShopSchedule {
  @Prop({ type: Number, required: true }) // 0-6, 0 = Monday
  dayOfWeek: number;

  @Prop({ type: String, required: true }) // "09:00"
  openTime: string;

  @Prop({ type: String, required: true }) // "22:00"
  closeTime: string;

  @Prop({ type: Boolean, default: false })
  isClosed: boolean;
}

export const ShopScheduleSchema = SchemaFactory.createForClass(ShopSchedule);

@Schema({ _id: false })
export class ShopAddress {
  @Prop({ type: String, enum: City, required: true })
  city: City;

  @Prop({ type: String, required: true })
  street: string;

  @Prop({ type: String })
  building: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export const ShopAddressSchema = SchemaFactory.createForClass(ShopAddress);

@Schema({ _id: false })
export class DeliveryZone {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string; // "Центр", "Окраина"

  @Prop({ type: Number, required: true })
  deliveryPrice: number; // копейки

  @Prop({ type: Number, default: 0 })
  freeDeliveryFrom: number; // бесплатно от X копеек

  @Prop({ type: Number, default: 60 })
  estimatedMinutes: number;

  @Prop({
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon',
    },
    coordinates: {
      type: [[[Number]]], // массив колец, каждое кольцо — массив точек
      required: true,
    },
  })
  polygon: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export const DeliveryZoneSchema = SchemaFactory.createForClass(DeliveryZone);

@Schema({ _id: false })
export class ShopStatistics {
  @Prop({ type: Number, default: 0 })
  totalOrders: number;

  @Prop({ type: Number, default: 0 })
  totalRevenue: number;

  @Prop({ type: Number, default: 0 })
  rating: number; // 0-5

  @Prop({ type: Number, default: 0 })
  reviewsCount: number;
}

export const ShopStatisticsSchema = SchemaFactory.createForClass(ShopStatistics);

@Schema({
  timestamps: true,
  collection: 'shops',
  toJSON: { virtuals: true },
})
export class Shop {
  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true, index: true })
  sellerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  logoUrl?: string;

  @Prop({ type: String })
  coverUrl?: string;

  @Prop({ type: ShopAddressSchema, required: true })
  address: ShopAddress;

  @Prop({ type: [ShopScheduleSchema], default: [] })
  schedule: ShopSchedule[];

  @Prop({ type: [DeliveryZoneSchema], default: [] })
  deliveryZones: DeliveryZone[];

  @Prop({ type: Number, default: 0 })
  minOrderAmount: number; // копейки

  @Prop({ type: String, enum: ShopStatus, default: ShopStatus.PENDING })
  status: ShopStatus;

  @Prop({ type: ShopStatisticsSchema, default: () => ({}) })
  statistics: ShopStatistics;

  // Виртуальные
  shopId: string;
  city: City;
  isOpen: boolean;
}

export type ShopDocument = Shop & Document;
export const ShopSchema = SchemaFactory.createForClass(Shop);

ShopSchema.virtual('shopId').get(function () {
  return this._id.toHexString();
});

ShopSchema.virtual('city').get(function () {
  return this.address?.city;
});

// Индексы
ShopSchema.index({ sellerId: 1 });
ShopSchema.index({ 'address.city': 1 });
ShopSchema.index({ status: 1 });
ShopSchema.index({ 'address.location': '2dsphere' });
ShopSchema.index({ 'deliveryZones.polygon': '2dsphere' });
```

---

## 6. Shop Port

```typescript
// src/modules/business/shop/shop.port.ts
import * as ShopCommands from './shop.commands';
import * as ShopQueries from './shop.queries';
import { Shop } from './shop.schema';

export const SHOP_PORT = Symbol('SHOP_PORT');

export interface ShopPort {
  // Commands
  create(command: ShopCommands.CreateCommand): Promise<Shop>;
  update(command: ShopCommands.UpdateCommand): Promise<Shop>;
  updateSchedule(command: ShopCommands.UpdateScheduleCommand): Promise<Shop>;
  addDeliveryZone(command: ShopCommands.AddDeliveryZoneCommand): Promise<Shop>;
  updateDeliveryZone(command: ShopCommands.UpdateDeliveryZoneCommand): Promise<Shop>;
  removeDeliveryZone(command: ShopCommands.RemoveDeliveryZoneCommand): Promise<Shop>;
  pause(command: ShopCommands.PauseCommand): Promise<Shop>;
  resume(command: ShopCommands.ResumeCommand): Promise<Shop>;

  // Queries
  getById(query: ShopQueries.GetByIdQuery): Promise<Shop>;
  getBySellerId(query: ShopQueries.GetBySellerIdQuery): Promise<Shop[]>;
  getByCity(query: ShopQueries.GetByCityQuery): Promise<Shop[]>;
  findDeliveryZone(query: ShopQueries.FindDeliveryZoneQuery): Promise<DeliveryZone | null>;
  isPointInDeliveryZone(query: ShopQueries.IsPointInZoneQuery): Promise<boolean>;
}
```

---

## 7. Взаимодействие с другими модулями

| Модуль | Направление | Описание |
|--------|-------------|----------|
| AUTH | ← | Создание Customer/Seller при регистрации |
| ORDERS | → | Получение профиля клиента для заказа |
| STOREFRONT | → | Информация о магазине для витрины |
| GEO | → | Геокодинг адресов, проверка зон |
| FINANCE | → | Привязка кошельков к селлеру/магазину |
| WORKFORCE | → | Привязка сотрудников к магазину |

---

## 8. Endpoints

### Customer

```
GET    /customer/profile
PATCH  /customer/profile
GET    /customer/addresses
POST   /customer/addresses
PATCH  /customer/addresses/:id
DELETE /customer/addresses/:id
POST   /customer/addresses/:id/default
```

### Seller

```
GET    /seller/profile
PATCH  /seller/profile
GET    /seller/shops
POST   /seller/shops
```

### Shop

```
GET    /seller/shops/:id
PATCH  /seller/shops/:id
PATCH  /seller/shops/:id/schedule
POST   /seller/shops/:id/zones
PATCH  /seller/shops/:id/zones/:zoneId
DELETE /seller/shops/:id/zones/:zoneId
POST   /seller/shops/:id/pause
POST   /seller/shops/:id/resume
```

---

## Чеклист готовности

- [ ] Customer CRUD работает
- [ ] Адреса с city добавляются/удаляются
- [ ] bonusBalance обновляется
- [ ] Seller CRUD работает
- [ ] Shop CRUD работает
- [ ] Зоны доставки (полигоны) сохраняются
- [ ] Геоиндексы работают
- [ ] Интеграция с AUTH работает
