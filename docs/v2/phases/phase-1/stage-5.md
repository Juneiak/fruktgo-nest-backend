# Этап 1.5: ORDERS (Заказы)

## Краткое содержание

Модуль заказов: Cart (корзина), Order (заказ), FSM статусов. Tolerance логика для весовых товаров (±10%).

## Предполагаемый результат

- Корзина CRUD работает
- Checkout создаёт заказ из корзины
- FSM контролирует переходы статусов
- Tolerance рассчитывается при сборке
- События заказа записываются

---

## 1. Структура модуля

```
src/modules/orders/
├── index.ts
├── orders.module.ts
├── cart/
│   ├── cart.port.ts
│   ├── cart.service.ts
│   ├── cart.schema.ts
│   ├── cart.commands.ts
│   └── cart.queries.ts
├── order/
│   ├── order.port.ts
│   ├── order.service.ts
│   ├── order.schema.ts
│   ├── order.commands.ts
│   ├── order.queries.ts
│   ├── order.enums.ts
│   └── order.fsm.ts
└── order.events.ts
```

---

## 2. Order Enums

```typescript
// src/modules/orders/order/order.enums.ts

export enum OrderStatus {
  CREATED = 'created',           // Создан, ожидает оплаты
  PAID = 'paid',                 // Оплачен
  ASSEMBLING = 'assembling',     // Собирается
  ASSEMBLED = 'assembled',       // Собран, ждёт курьера
  DELIVERING = 'delivering',     // В доставке
  DELIVERED = 'delivered',       // Доставлен
  CANCELLED = 'cancelled',       // Отменён клиентом
  DECLINED = 'declined',         // Отклонён магазином
  REFUNDED = 'refunded',         // Возврат
}

export enum PaymentStatus {
  PENDING = 'pending',
  HOLD = 'hold',           // Деньги захолдированы
  CAPTURED = 'captured',   // Списаны
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
  BONUS = 'bonus',         // Оплата баллами
}

export enum CancellationReason {
  CUSTOMER_REQUEST = 'customer_request',
  OUT_OF_STOCK = 'out_of_stock',
  SHOP_CLOSED = 'shop_closed',
  DELIVERY_UNAVAILABLE = 'delivery_unavailable',
  PAYMENT_FAILED = 'payment_failed',
  OTHER = 'other',
}
```

---

## 3. Order FSM

```typescript
// src/modules/orders/order/order.fsm.ts
import { OrderStatus } from './order.enums';
import { DomainError } from 'src/common';

/**
 * Finite State Machine для статусов заказа.
 * Определяет допустимые переходы.
 */
export const OrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.CREATED]: [
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.ASSEMBLING,
    OrderStatus.DECLINED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.ASSEMBLING]: [
    OrderStatus.ASSEMBLED,
    OrderStatus.DECLINED,
  ],
  [OrderStatus.ASSEMBLED]: [
    OrderStatus.DELIVERING,
    OrderStatus.DECLINED,
  ],
  [OrderStatus.DELIVERING]: [
    OrderStatus.DELIVERED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.DELIVERED]: [
    OrderStatus.REFUNDED, // Частичный возврат
  ],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.DECLINED]: [],
  [OrderStatus.REFUNDED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return OrderTransitions[from]?.includes(to) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw DomainError.invariant(
      `Invalid status transition: ${from} → ${to}`,
      { from, to, allowed: OrderTransitions[from] },
    );
  }
}

export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  return OrderTransitions[current] || [];
}
```

---

## 4. Cart Schema

```typescript
// src/modules/orders/cart/cart.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { City } from 'src/common';

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  shopProductId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0.1 })
  quantity: number; // Может быть дробным для весовых

  @Prop({ type: Number, required: true })
  priceAtAdd: number; // Цена на момент добавления (копейки)
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ _id: false })
export class CartDeliveryInfo {
  @Prop({ type: Types.ObjectId })
  addressId?: Types.ObjectId;

  @Prop({ type: String })
  addressText?: string;

  @Prop({ type: [Number] }) // [lng, lat]
  coordinates?: number[];

  @Prop({ type: Number })
  deliveryPrice?: number; // копейки

  @Prop({ type: Number })
  estimatedMinutes?: number;
}

export const CartDeliveryInfoSchema = SchemaFactory.createForClass(CartDeliveryInfo);

@Schema({
  timestamps: true,
  collection: 'carts',
  toJSON: { virtuals: true },
})
export class Cart {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: String, enum: City, required: true })
  city: City;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ type: CartDeliveryInfoSchema })
  deliveryInfo?: CartDeliveryInfo;

  @Prop({ type: String })
  promoCode?: string;

  @Prop({ type: Number, default: 0 })
  bonusToUse: number; // Баллы к списанию

  // Виртуальные (вычисляемые)
  cartId: string;
  itemsTotal: number;
  deliveryTotal: number;
  discountTotal: number;
  grandTotal: number;
}

export type CartDocument = Cart & Document;
export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.virtual('cartId').get(function () {
  return this._id.toHexString();
});
```

---

## 5. Order Schema

```typescript
// src/modules/orders/order/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { City } from 'src/common';
import { OrderStatus, PaymentStatus, PaymentMethod, CancellationReason } from './order.enums';

// === Подсхемы ===

@Schema({ _id: false })
export class OrderCustomer {
  @Prop({ type: Types.ObjectId, required: true })
  customerId: Types.ObjectId;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  phone: string;
}

export const OrderCustomerSchema = SchemaFactory.createForClass(OrderCustomer);

@Schema({ _id: false })
export class OrderShop {
  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  phone?: string;
}

export const OrderShopSchema = SchemaFactory.createForClass(OrderShop);

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, auto: true })
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  shopProductId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  imageUrl?: string;

  @Prop({ type: Number, required: true })
  price: number; // копейки за единицу

  @Prop({ type: Number, required: true })
  quantity: number; // Заказанное количество

  @Prop({ type: Number })
  actualQuantity?: number; // Фактическое (после сборки)

  @Prop({ type: Number, required: true })
  total: number; // price * quantity (копейки)

  @Prop({ type: Number })
  actualTotal?: number; // После сборки

  @Prop({ type: Boolean, default: false })
  isWeighted: boolean;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class OrderDelivery {
  @Prop({ type: String, required: true })
  addressText: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[]; // [lng, lat]

  @Prop({ type: Number, required: true })
  price: number; // копейки

  @Prop({ type: Number })
  estimatedMinutes?: number;

  @Prop({ type: Date })
  estimatedAt?: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Types.ObjectId })
  courierId?: Types.ObjectId;

  @Prop({ type: String })
  courierName?: string;

  @Prop({ type: String })
  courierPhone?: string;
}

export const OrderDeliverySchema = SchemaFactory.createForClass(OrderDelivery);

@Schema({ _id: false })
export class OrderFinances {
  @Prop({ type: Number, required: true })
  itemsTotal: number; // Сумма товаров

  @Prop({ type: Number, required: true })
  deliveryTotal: number;

  @Prop({ type: Number, default: 0 })
  discountTotal: number; // Скидка по промокоду

  @Prop({ type: Number, default: 0 })
  bonusUsed: number; // Списано баллов

  @Prop({ type: Number, required: true })
  grandTotal: number; // Итого к оплате

  @Prop({ type: Number })
  actualTotal?: number; // После сборки (с учётом tolerance)

  @Prop({ type: Number, default: 0 })
  bonusCompensation: number; // Компенсация недовеса баллами
}

export const OrderFinancesSchema = SchemaFactory.createForClass(OrderFinances);

@Schema({ _id: false })
export class OrderPayment {
  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ type: String })
  externalId?: string; // ID в платёжной системе

  @Prop({ type: Date })
  paidAt?: Date;
}

export const OrderPaymentSchema = SchemaFactory.createForClass(OrderPayment);

@Schema({ _id: false })
export class OrderEvent {
  @Prop({ type: String, required: true })
  type: string; // status_changed, item_updated, etc.

  @Prop({ type: String })
  fromStatus?: string;

  @Prop({ type: String })
  toStatus?: string;

  @Prop({ type: String })
  performedBy: string;

  @Prop({ type: String })
  performedByType: string; // customer, employee, system

  @Prop({ type: String })
  comment?: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const OrderEventSchema = SchemaFactory.createForClass(OrderEvent);

// === Основная схема ===

@Schema({
  timestamps: true,
  collection: 'orders',
  toJSON: { virtuals: true },
})
export class Order {
  @Prop({ type: String, unique: true, required: true })
  orderNumber: string; // FG-240101-0001

  @Prop({ type: String, enum: City, required: true, index: true })
  city: City;

  @Prop({ type: OrderCustomerSchema, required: true })
  customer: OrderCustomer;

  @Prop({ type: OrderShopSchema, required: true })
  shop: OrderShop;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: OrderDeliverySchema, required: true })
  delivery: OrderDelivery;

  @Prop({ type: OrderFinancesSchema, required: true })
  finances: OrderFinances;

  @Prop({ type: OrderPaymentSchema, required: true })
  payment: OrderPayment;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.CREATED, index: true })
  status: OrderStatus;

  @Prop({ type: String })
  promoCode?: string;

  // Tolerance
  @Prop({ type: Number, default: 0.1 })
  tolerancePercent: number; // 10% по умолчанию

  // Cancellation
  @Prop({ type: String, enum: CancellationReason })
  cancellationReason?: CancellationReason;

  @Prop({ type: String })
  cancellationComment?: string;

  // Shift
  @Prop({ type: Types.ObjectId })
  shiftId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  assembledBy?: Types.ObjectId;

  // History
  @Prop({ type: [OrderEventSchema], default: [] })
  events: OrderEvent[];

  // Rating
  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number;

  @Prop({ type: String })
  ratingComment?: string;

  // Виртуальные
  orderId: string;
}

export type OrderDocument = Order & Document;
export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.virtual('orderId').get(function () {
  return this._id.toHexString();
});

// Индексы
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ 'customer.customerId': 1, createdAt: -1 });
OrderSchema.index({ 'shop.shopId': 1, status: 1, createdAt: -1 });
OrderSchema.index({ city: 1, status: 1 });
OrderSchema.index({ shiftId: 1 });
```

---

## 6. Order Port

```typescript
// src/modules/orders/order/order.port.ts
import * as OrderCommands from './order.commands';
import * as OrderQueries from './order.queries';
import { Order } from './order.schema';
import { PaginatedResult } from 'src/common';

export const ORDER_PORT = Symbol('ORDER_PORT');

export interface OrderPort {
  // Commands
  create(command: OrderCommands.CreateCommand): Promise<Order>;
  updateStatus(command: OrderCommands.UpdateStatusCommand): Promise<Order>;
  updatePayment(command: OrderCommands.UpdatePaymentCommand): Promise<Order>;
  completeAssembly(command: OrderCommands.CompleteAssemblyCommand): Promise<Order>;
  assignCourier(command: OrderCommands.AssignCourierCommand): Promise<Order>;
  complete(command: OrderCommands.CompleteCommand): Promise<Order>;
  cancel(command: OrderCommands.CancelCommand): Promise<Order>;
  decline(command: OrderCommands.DeclineCommand): Promise<Order>;
  setRating(command: OrderCommands.SetRatingCommand): Promise<Order>;

  // Queries
  getById(query: OrderQueries.GetByIdQuery): Promise<Order>;
  getByOrderNumber(query: OrderQueries.GetByOrderNumberQuery): Promise<Order>;
  getByCustomer(query: OrderQueries.GetByCustomerQuery): Promise<PaginatedResult<Order>>;
  getByShop(query: OrderQueries.GetByShopQuery): Promise<PaginatedResult<Order>>;
  getByShift(query: OrderQueries.GetByShiftQuery): Promise<Order[]>;
  getActiveByShop(query: OrderQueries.GetActiveByShopQuery): Promise<Order[]>;
}
```

---

## 7. Tolerance Calculation

```typescript
// src/modules/orders/order/order.service.ts (частично)

/**
 * Расчёт tolerance при завершении сборки.
 * 
 * - Если actualQuantity < quantity * (1 - tolerance) → компенсация баллами
 * - Если actualQuantity > quantity * (1 + tolerance) → перевес за счёт магазина
 */
calculateTolerance(
  item: OrderItem,
  actualQuantity: number,
  tolerancePercent: number,
): ToleranceResult {
  const { quantity, price, isWeighted } = item;
  
  if (!isWeighted) {
    // Для штучных товаров — без tolerance
    return {
      actualQuantity,
      actualTotal: price * actualQuantity,
      compensation: 0,
    };
  }

  const minAllowed = quantity * (1 - tolerancePercent);
  const maxAllowed = quantity * (1 + tolerancePercent);
  
  let compensation = 0;
  let chargeQuantity = actualQuantity;

  if (actualQuantity < minAllowed) {
    // Недовес сверх tolerance — компенсация баллами
    const shortfall = quantity - actualQuantity;
    compensation = Math.round(shortfall * price); // В копейках → баллы
    chargeQuantity = actualQuantity; // Берём только за фактическое
  } else if (actualQuantity > maxAllowed) {
    // Перевес — берём только до верхней границы
    chargeQuantity = maxAllowed;
  }

  return {
    actualQuantity,
    actualTotal: Math.round(chargeQuantity * price),
    compensation,
  };
}

interface ToleranceResult {
  actualQuantity: number;
  actualTotal: number;
  compensation: number; // Баллы компенсации
}
```

---

## 8. Cart Port

```typescript
// src/modules/orders/cart/cart.port.ts
import * as CartCommands from './cart.commands';
import * as CartQueries from './cart.queries';
import { Cart } from './cart.schema';

export const CART_PORT = Symbol('CART_PORT');

export interface CartPort {
  // Commands
  addItem(command: CartCommands.AddItemCommand): Promise<Cart>;
  updateItem(command: CartCommands.UpdateItemCommand): Promise<Cart>;
  removeItem(command: CartCommands.RemoveItemCommand): Promise<Cart>;
  clear(command: CartCommands.ClearCommand): Promise<void>;
  setDeliveryInfo(command: CartCommands.SetDeliveryInfoCommand): Promise<Cart>;
  setPromoCode(command: CartCommands.SetPromoCodeCommand): Promise<Cart>;
  setBonusToUse(command: CartCommands.SetBonusToUseCommand): Promise<Cart>;

  // Queries
  getByCustomer(query: CartQueries.GetByCustomerQuery): Promise<Cart | null>;
  calculate(query: CartQueries.CalculateQuery): Promise<CartCalculation>;
}

export interface CartCalculation {
  items: CartItemCalculation[];
  itemsTotal: number;
  deliveryTotal: number;
  discountTotal: number;
  bonusDiscount: number;
  grandTotal: number;
  canCheckout: boolean;
  errors: string[];
}
```

---

## 9. Order Events

```typescript
// src/modules/orders/order.events.ts

export const ORDER_EVENTS = {
  CREATED: 'order.created',
  PAID: 'order.paid',
  STATUS_CHANGED: 'order.status_changed',
  ASSEMBLED: 'order.assembled',
  DELIVERED: 'order.delivered',
  CANCELLED: 'order.cancelled',
  DECLINED: 'order.declined',
  RATED: 'order.rated',
} as const;

export interface OrderCreatedEvent {
  orderId: string;
  orderNumber: string;
  customerId: string;
  shopId: string;
  city: string;
  grandTotal: number;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
}

export interface OrderAssembledEvent {
  orderId: string;
  shiftId: string;
  assembledBy: string;
  actualTotal: number;
  bonusCompensation: number;
}
```

---

## 10. Взаимодействие с другими модулями

| Модуль | Направление | Описание |
|--------|-------------|----------|
| CUSTOMER | ← | Данные клиента для заказа |
| BUSINESS | ← | Данные магазина |
| STOREFRONT | ← | Товары для корзины |
| INVENTORY | → | Резервирование при checkout, списание при сборке |
| FINANCE | → | Запись транзакций (Фаза 2) |
| LOGISTICS | → | Создание доставки |
| LOYALTY | → | Компенсация баллами |
| COMMUNICATIONS | → | Уведомления о статусах |

---

## 11. Endpoints

### Customer

```
GET    /customer/cart
POST   /customer/cart/items
PATCH  /customer/cart/items/:id
DELETE /customer/cart/items/:id
DELETE /customer/cart
POST   /customer/cart/delivery
POST   /customer/cart/promo
POST   /customer/cart/checkout
GET    /customer/orders
GET    /customer/orders/:id
POST   /customer/orders/:id/cancel
POST   /customer/orders/:id/rate
```

### Seller/Employee

```
GET    /seller/shops/:shopId/orders
GET    /seller/shops/:shopId/orders/active
GET    /seller/shops/:shopId/orders/:id
POST   /seller/shops/:shopId/orders/:id/accept
POST   /seller/shops/:shopId/orders/:id/complete-assembly
POST   /seller/shops/:shopId/orders/:id/decline
```

---

## Чеклист готовности

- [ ] Cart CRUD работает
- [ ] Checkout создаёт Order
- [ ] FSM блокирует невалидные переходы
- [ ] Tolerance рассчитывается корректно
- [ ] OrderEvents записываются
- [ ] Уведомления отправляются
- [ ] Интеграция с INVENTORY работает
