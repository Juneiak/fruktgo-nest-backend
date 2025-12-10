# Этап 1.7: LOGISTICS & GEO

## Краткое содержание

LOGISTICS — управление доставкой (Delivery). GEO — геокодинг адресов, зоны доставки, проверка точек в зонах.

## Предполагаемый результат

- Доставка создаётся при checkout
- Зоны доставки магазина работают (полигоны)
- Геокодинг через DaData работает
- Расчёт стоимости по зонам работает

---

# GEO

## 1. Структура модуля

```
src/infra/geo/
├── index.ts
├── geo.module.ts
├── geocoding/
│   ├── geocoding.port.ts
│   ├── geocoding.service.ts
│   └── dadata.adapter.ts
└── zones/
    ├── zones.port.ts
    ├── zones.service.ts
    └── zones.types.ts
```

---

## 2. Geocoding Port

```typescript
// src/infra/geo/geocoding/geocoding.port.ts

export const GEOCODING_PORT = Symbol('GEOCODING_PORT');

export interface GeocodingPort {
  /**
   * Поиск адреса по строке
   */
  suggest(query: string, options?: SuggestOptions): Promise<AddressSuggestion[]>;

  /**
   * Геокодинг: адрес → координаты
   */
  geocode(address: string): Promise<GeocodingResult | null>;

  /**
   * Обратный геокодинг: координаты → адрес
   */
  reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null>;
}

export interface SuggestOptions {
  city?: string;
  limit?: number;
}

export interface AddressSuggestion {
  value: string;       // Полный адрес
  city: string;
  street: string;
  building?: string;
  apartment?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  fiasId?: string;
}

export interface GeocodingResult {
  address: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  fiasId?: string;
}
```

---

## 3. DaData Adapter

```typescript
// src/infra/geo/geocoding/dadata.adapter.ts
import { Injectable, HttpException } from '@nestjs/common';
import axios from 'axios';
import { GeocodingPort, AddressSuggestion, GeocodingResult, SuggestOptions } from './geocoding.port';

@Injectable()
export class DaDataAdapter implements GeocodingPort {
  private readonly apiUrl = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs';
  private readonly apiKey = process.env.DADATA_API_KEY;
  private readonly secretKey = process.env.DADATA_SECRET_KEY;

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Token ${this.apiKey}`,
      'X-Secret': this.secretKey,
    };
  }

  async suggest(query: string, options?: SuggestOptions): Promise<AddressSuggestion[]> {
    const response = await axios.post(
      `${this.apiUrl}/suggest/address`,
      {
        query,
        count: options?.limit || 10,
        locations: options?.city ? [{ city: options.city }] : undefined,
      },
      { headers: this.headers },
    );

    return response.data.suggestions.map((s: any) => ({
      value: s.value,
      city: s.data.city,
      street: s.data.street_with_type,
      building: s.data.house,
      coordinates: s.data.geo_lat && s.data.geo_lon
        ? { lat: parseFloat(s.data.geo_lat), lng: parseFloat(s.data.geo_lon) }
        : undefined,
      fiasId: s.data.fias_id,
    }));
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    const response = await axios.post(
      `${this.apiUrl}/suggest/address`,
      { query: address, count: 1 },
      { headers: this.headers },
    );

    const suggestion = response.data.suggestions[0];
    if (!suggestion || !suggestion.data.geo_lat) {
      return null;
    }

    return {
      address: suggestion.value,
      city: suggestion.data.city,
      coordinates: {
        lat: parseFloat(suggestion.data.geo_lat),
        lng: parseFloat(suggestion.data.geo_lon),
      },
      fiasId: suggestion.data.fias_id,
    };
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
    const response = await axios.post(
      `${this.apiUrl}/geolocate/address`,
      { lat, lon: lng, count: 1 },
      { headers: this.headers },
    );

    const suggestion = response.data.suggestions[0];
    if (!suggestion) {
      return null;
    }

    return {
      address: suggestion.value,
      city: suggestion.data.city,
      coordinates: { lat, lng },
      fiasId: suggestion.data.fias_id,
    };
  }
}
```

---

## 4. Zones Port

```typescript
// src/infra/geo/zones/zones.port.ts

export const ZONES_PORT = Symbol('ZONES_PORT');

export interface ZonesPort {
  /**
   * Проверяет, находится ли точка в зоне доставки
   */
  isPointInZone(
    point: [number, number], // [lng, lat]
    zonePolygon: number[][][],
  ): boolean;

  /**
   * Находит подходящую зону доставки для точки
   */
  findZoneForPoint(
    shopId: string,
    point: [number, number],
  ): Promise<DeliveryZoneResult | null>;

  /**
   * Рассчитывает стоимость доставки
   */
  calculateDeliveryPrice(
    zone: DeliveryZoneResult,
    orderAmount: number,
  ): DeliveryPriceResult;
}

export interface DeliveryZoneResult {
  zoneId: string;
  zoneName: string;
  deliveryPrice: number;
  freeDeliveryFrom: number;
  estimatedMinutes: number;
}

export interface DeliveryPriceResult {
  price: number;           // Итоговая цена доставки
  originalPrice: number;   // Без учёта бесплатной доставки
  isFree: boolean;
  estimatedMinutes: number;
}
```

---

## 5. Zones Service

```typescript
// src/infra/geo/zones/zones.service.ts
import { Injectable } from '@nestjs/common';
import { ZonesPort, DeliveryZoneResult, DeliveryPriceResult } from './zones.port';
import { SHOP_PORT, ShopPort } from 'src/modules/business';
import * as turf from '@turf/turf';

@Injectable()
export class ZonesService implements ZonesPort {
  constructor(
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
  ) {}

  isPointInZone(point: [number, number], zonePolygon: number[][][]): boolean {
    const turfPoint = turf.point(point);
    const turfPolygon = turf.polygon(zonePolygon);
    return turf.booleanPointInPolygon(turfPoint, turfPolygon);
  }

  async findZoneForPoint(
    shopId: string,
    point: [number, number],
  ): Promise<DeliveryZoneResult | null> {
    const shop = await this.shopPort.getById({ shopId });
    
    for (const zone of shop.deliveryZones) {
      if (this.isPointInZone(point, zone.polygon.coordinates)) {
        return {
          zoneId: zone._id.toString(),
          zoneName: zone.name,
          deliveryPrice: zone.deliveryPrice,
          freeDeliveryFrom: zone.freeDeliveryFrom,
          estimatedMinutes: zone.estimatedMinutes,
        };
      }
    }

    return null;
  }

  calculateDeliveryPrice(
    zone: DeliveryZoneResult,
    orderAmount: number,
  ): DeliveryPriceResult {
    const isFree = zone.freeDeliveryFrom > 0 && orderAmount >= zone.freeDeliveryFrom;
    
    return {
      price: isFree ? 0 : zone.deliveryPrice,
      originalPrice: zone.deliveryPrice,
      isFree,
      estimatedMinutes: zone.estimatedMinutes,
    };
  }
}
```

---

# LOGISTICS

## 1. Структура модуля

```
src/infra/logistics/
├── index.ts
├── logistics.module.ts
├── delivery/
│   ├── delivery.port.ts
│   ├── delivery.service.ts
│   ├── delivery.schema.ts
│   ├── delivery.commands.ts
│   ├── delivery.queries.ts
│   └── delivery.enums.ts
└── delivery.events.ts
```

---

## 2. Delivery Enums

```typescript
// src/infra/logistics/delivery/delivery.enums.ts

export enum DeliveryStatus {
  PENDING = 'pending',           // Ожидает курьера
  ASSIGNED = 'assigned',         // Курьер назначен
  PICKED_UP = 'picked_up',       // Забран из магазина
  IN_TRANSIT = 'in_transit',     // В пути
  ARRIVED = 'arrived',           // Прибыл к клиенту
  DELIVERED = 'delivered',       // Доставлен
  FAILED = 'failed',             // Не удалось доставить
  CANCELLED = 'cancelled',
}

export enum DeliveryType {
  COURIER = 'courier',           // Курьер магазина
  SELF_PICKUP = 'self_pickup',   // Самовывоз
}
```

---

## 3. Delivery Schema

```typescript
// src/infra/logistics/delivery/delivery.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { City } from 'src/common';
import { DeliveryStatus, DeliveryType } from './delivery.enums';

@Schema({ _id: false })
export class DeliveryAddress {
  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[]; // [lng, lat]

  @Prop({ type: String })
  apartment?: string;

  @Prop({ type: String })
  entrance?: string;

  @Prop({ type: String })
  floor?: string;

  @Prop({ type: String })
  intercom?: string;

  @Prop({ type: String })
  comment?: string;
}

export const DeliveryAddressSchema = SchemaFactory.createForClass(DeliveryAddress);

@Schema({ _id: false })
export class DeliveryCourier {
  @Prop({ type: Types.ObjectId, required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: Date })
  assignedAt: Date;
}

export const DeliveryCourierSchema = SchemaFactory.createForClass(DeliveryCourier);

@Schema({ _id: false })
export class DeliveryEvent {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, enum: DeliveryStatus })
  status?: DeliveryStatus;

  @Prop({ type: String })
  comment?: string;

  @Prop({ type: [Number] })
  location?: number[]; // [lng, lat] — геолокация курьера

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const DeliveryEventSchema = SchemaFactory.createForClass(DeliveryEvent);

@Schema({
  timestamps: true,
  collection: 'deliveries',
  toJSON: { virtuals: true },
})
export class Delivery {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: String, enum: City, required: true })
  city: City;

  @Prop({ type: String, enum: DeliveryType, required: true })
  type: DeliveryType;

  @Prop({ type: String, enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Prop({ type: DeliveryAddressSchema, required: true })
  address: DeliveryAddress;

  @Prop({ type: DeliveryCourierSchema })
  courier?: DeliveryCourier;

  @Prop({ type: Number, required: true })
  price: number; // копейки

  @Prop({ type: Number, required: true })
  estimatedMinutes: number;

  @Prop({ type: Date })
  estimatedAt?: Date;

  @Prop({ type: Date })
  pickedUpAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: String })
  failureReason?: string;

  @Prop({ type: [DeliveryEventSchema], default: [] })
  events: DeliveryEvent[];

  // Customer rating
  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number;

  @Prop({ type: String })
  ratingComment?: string;

  // Виртуальные
  deliveryId: string;
}

export type DeliveryDocument = Delivery & Document;
export const DeliverySchema = SchemaFactory.createForClass(Delivery);

DeliverySchema.virtual('deliveryId').get(function () {
  return this._id.toHexString();
});

// Индексы
DeliverySchema.index({ orderId: 1 }, { unique: true });
DeliverySchema.index({ shopId: 1, status: 1 });
DeliverySchema.index({ 'courier.employeeId': 1, status: 1 });
DeliverySchema.index({ city: 1, status: 1 });
```

---

## 4. Delivery Port

```typescript
// src/infra/logistics/delivery/delivery.port.ts
import * as DeliveryCommands from './delivery.commands';
import * as DeliveryQueries from './delivery.queries';
import { Delivery } from './delivery.schema';

export const DELIVERY_PORT = Symbol('DELIVERY_PORT');

export interface DeliveryPort {
  // Commands
  create(command: DeliveryCommands.CreateCommand): Promise<Delivery>;
  assignCourier(command: DeliveryCommands.AssignCourierCommand): Promise<Delivery>;
  pickup(command: DeliveryCommands.PickupCommand): Promise<Delivery>;
  updateLocation(command: DeliveryCommands.UpdateLocationCommand): Promise<Delivery>;
  arrive(command: DeliveryCommands.ArriveCommand): Promise<Delivery>;
  complete(command: DeliveryCommands.CompleteCommand): Promise<Delivery>;
  fail(command: DeliveryCommands.FailCommand): Promise<Delivery>;
  cancel(command: DeliveryCommands.CancelCommand): Promise<Delivery>;
  rate(command: DeliveryCommands.RateCommand): Promise<Delivery>;

  // Queries
  getById(query: DeliveryQueries.GetByIdQuery): Promise<Delivery>;
  getByOrderId(query: DeliveryQueries.GetByOrderIdQuery): Promise<Delivery>;
  getByShop(query: DeliveryQueries.GetByShopQuery): Promise<Delivery[]>;
  getByCourier(query: DeliveryQueries.GetByCourierQuery): Promise<Delivery[]>;
  getPendingByShop(query: DeliveryQueries.GetPendingByShopQuery): Promise<Delivery[]>;
}
```

---

## 5. Delivery Commands

```typescript
// src/infra/logistics/delivery/delivery.commands.ts
import { CommonCommandOptions, City } from 'src/common';
import { DeliveryType, DeliveryAddress } from './delivery.schema';

export class CreateCommand {
  constructor(
    public readonly data: {
      orderId: string;
      shopId: string;
      city: City;
      type: DeliveryType;
      address: DeliveryAddress;
      price: number;
      estimatedMinutes: number;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class AssignCourierCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly courier: {
      employeeId: string;
      name: string;
      phone?: string;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class PickupCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly location?: [number, number],
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UpdateLocationCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly location: [number, number],
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class CompleteCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly location?: [number, number],
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class FailCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly reason: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class RateCommand {
  constructor(
    public readonly deliveryId: string,
    public readonly rating: number,
    public readonly comment?: string,
    public readonly options?: CommonCommandOptions,
  ) {}
}
```

---

## 6. Delivery Events

```typescript
// src/infra/logistics/delivery.events.ts

export const DELIVERY_EVENTS = {
  CREATED: 'delivery.created',
  ASSIGNED: 'delivery.assigned',
  PICKED_UP: 'delivery.picked_up',
  IN_TRANSIT: 'delivery.in_transit',
  ARRIVED: 'delivery.arrived',
  COMPLETED: 'delivery.completed',
  FAILED: 'delivery.failed',
} as const;

export interface DeliveryCreatedEvent {
  deliveryId: string;
  orderId: string;
  shopId: string;
  city: string;
}

export interface DeliveryAssignedEvent {
  deliveryId: string;
  orderId: string;
  courierId: string;
  courierName: string;
}

export interface DeliveryCompletedEvent {
  deliveryId: string;
  orderId: string;
  deliveredAt: Date;
}
```

---

## 7. Взаимодействие с другими модулями

| Модуль | Направление | Описание |
|--------|-------------|----------|
| BUSINESS | ← | Зоны доставки магазина |
| ORDERS | ← | Создание доставки при checkout |
| WORKFORCE | ← | Курьеры (Employee с ролью courier) |
| CUSTOMER | ← | Адрес доставки |
| COMMUNICATIONS | → | Уведомления о статусе доставки |

---

## 8. Endpoints

### GEO

```
GET  /geo/suggest?query=...&city=...
POST /geo/geocode
POST /geo/reverse-geocode
GET  /geo/shops/:shopId/zones/check?lat=...&lng=...
```

### Delivery (Employee - Courier)

```
GET    /employee/deliveries
GET    /employee/deliveries/pending
GET    /employee/deliveries/:id
POST   /employee/deliveries/:id/pickup
POST   /employee/deliveries/:id/location
POST   /employee/deliveries/:id/arrive
POST   /employee/deliveries/:id/complete
POST   /employee/deliveries/:id/fail
```

### Delivery (Seller)

```
GET    /seller/shops/:shopId/deliveries
GET    /seller/shops/:shopId/deliveries/pending
POST   /seller/shops/:shopId/deliveries/:id/assign
```

---

## Чеклист готовности

- [ ] Геокодинг через DaData работает
- [ ] Зоны доставки проверяются (point in polygon)
- [ ] Стоимость доставки рассчитывается
- [ ] Доставка создаётся при checkout
- [ ] Курьер назначается на доставку
- [ ] Статусы доставки обновляются
- [ ] События доставки отправляются
