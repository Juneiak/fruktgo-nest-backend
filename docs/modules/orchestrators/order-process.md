# Order Process Orchestrator

Оркестратор сквозного процесса заказа. Координирует работу модулей: Order, Shop, Shift, Customer, ShopProduct.

**Путь:** `src/processes/order/`

---

## Обзор

Реализует полный цикл заказа согласно [order-flow.md](../../processes/order-flow.md):

```
Checkout → Accept → Assembly → HandToCourier → Deliver
                ↓               ↓
              Cancel          Decline
```

---

## Операции

### 1. Checkout (Оформление заказа)

Создаёт заказ из корзины клиента.

```typescript
const result = await orderProcess.checkout({
  customerId: '...',
  customerName: 'Иван Иванов',
  shopId: '...',
  deliveryAddress: {
    city: 'Москва',
    street: 'Ленина',
    house: '1',
    // ...
  },
  customerComment: 'Позвонить за 5 минут',
  source: OrderEventSource.APP,
});

// Result:
{
  orderId: string;
  orderStatus: 'pending';
  totalSum: number;
  deliveryPrice: number;
  estimatedDeliveryTime: number;
  products: [...];
}
```

**Что происходит:**
1. Проверяется клиент и корзина
2. Проверяется магазин (статус OPENED)
3. Проверяется смена (статус OPEN)
4. Валидируются товары (наличие, цены)
5. Рассчитываются финансы (сумма, комиссия, доставка)
6. Резервируются товары (уменьшается stockQuantity)
7. Создаётся заказ
8. Очищается корзина
9. Обновляется статистика смены

---

### 2. AcceptOrder (Принятие заказа)

Сотрудник принимает заказ в работу.

```typescript
await orderProcess.acceptOrder({
  orderId: '...',
  employeeId: '...',
  employeeName: 'Пётр Сборщиков',
});
```

**Переход статуса:** `PENDING` → `ASSEMBLING`

---

### 3. CompleteAssembly (Завершение сборки)

Сотрудник завершает сборку с указанием фактических весов.

```typescript
const result = await orderProcess.completeAssembly({
  orderId: '...',
  employeeId: '...',
  employeeName: 'Пётр Сборщиков',
  actualProducts: [
    { shopProductId: '...', actualQuantity: 0.95 }, // 950г вместо 1кг
    { shopProductId: '...', actualQuantity: 1.1 },  // 1.1кг вместо 1кг (перевес)
  ],
});

// Result:
{
  orderId: string;
  orderStatus: 'awaitingCourier';
  totalWeightCompensationBonus: number; // Бонусы за недовес
  adjustedTotalSum: number;
}
```

**Логика компенсации:**
- **Недовес < 90%**: Клиент получает бонусные баллы (1 балл = 1₽)
- **Недовес 90-100%**: Допустимый tolerance, без компенсации
- **Перевес > 100%**: За счёт магазина, клиент не доплачивает

**Переход статуса:** `ASSEMBLING` → `AWAITING_COURIER`

---

### 4. HandToCourier (Передача курьеру)

Заказ передан курьеру для доставки.

```typescript
await orderProcess.handToCourier({
  orderId: '...',
  employeeId: '...',
  employeeName: 'Пётр Сборщиков',
  courierInfo: 'Яндекс.Доставка #12345',
});
```

**Переход статуса:** `AWAITING_COURIER` → `IN_DELIVERY`

---

### 5. DeliverOrder (Доставка)

Заказ доставлен клиенту.

```typescript
const result = await orderProcess.deliverOrder({
  orderId: '...',
});

// Result:
{
  orderId: string;
  orderStatus: 'delivered';
  deliveredAt: Date;
}
```

**Переход статуса:** `IN_DELIVERY` → `DELIVERED`

**Что происходит:**
1. Статус заказа меняется на DELIVERED
2. Обновляется статистика смены (deliveredOrdersCount)
3. TODO: Создаётся SettlementTransaction для финансовых расчётов

---

### 6. CancelOrder (Отмена клиентом)

Клиент отменяет заказ до начала сборки.

```typescript
await orderProcess.cancelOrder({
  orderId: '...',
  reason: 'changedMind',
  canceledBy: {
    type: 'customer',
    id: '...',
    name: 'Иван Иванов',
  },
  comment: 'Передумал',
});
```

**Ограничение:** Только из статуса `PENDING`

**Что происходит:**
1. Статус заказа меняется на CANCELLED
2. Товары возвращаются на склад
3. TODO: Возврат бонусных баллов
4. TODO: Возврат средств

---

### 7. DeclineOrder (Отклонение магазином)

Магазин отклоняет заказ.

```typescript
await orderProcess.declineOrder({
  orderId: '...',
  reason: 'outOfStock',
  declinedBy: {
    type: 'employee',
    id: '...',
    name: 'Пётр Сборщиков',
  },
  comment: 'Яблоки закончились',
});
```

**Допустимые статусы:** `PENDING`, `ASSEMBLING`, `AWAITING_COURIER`

**Что происходит:**
1. Статус заказа меняется на DECLINED
2. Товары возвращаются на склад
3. Обновляется статистика смены (declinedOrdersCount, declinedIncome)
4. TODO: Возврат средств

---

### 8. SetRating (Оценка заказа)

Клиент оценивает доставленный заказ.

```typescript
await orderProcess.setRating({
  orderId: '...',
  customerId: '...',
  customerName: 'Иван Иванов',
  rating: 5,
  tags: ['freshProducts', 'fastDelivery'],
  comment: 'Отличный сервис!',
});
```

**Ограничение:** Только для заказов со статусом `DELIVERED`

---

## События

Оркестратор эмитит события через EventEmitter2:

| Событие | Когда | Payload |
|---------|-------|---------|
| `order.created` | После checkout | `{ orderId, customerId, shopId, totalSum }` |
| `order.accepted` | После acceptOrder | `{ orderId, employeeId }` |
| `order.assembly.completed` | После completeAssembly | `{ orderId, employeeId, totalCompensation }` |
| `order.handed.to.courier` | После handToCourier | `{ orderId }` |
| `order.delivered` | После deliverOrder | `{ orderId, deliveredAt }` |
| `order.cancelled` | После cancelOrder | `{ orderId, reason }` |
| `order.declined` | После declineOrder | `{ orderId, reason }` |
| `order.rated` | После setRating | `{ orderId, rating }` |

---

## Транзакции

Все операции, изменяющие несколько сущностей, выполняются в MongoDB транзакциях:

```typescript
const session = await this.connection.startSession();
try {
  await session.withTransaction(async () => {
    // Все операции атомарны
  });
} finally {
  await session.endSession();
}
```

---

## Использование

```typescript
import { Inject } from '@nestjs/common';
import { ORDER_PROCESS_ORCHESTRATOR, OrderProcessOrchestrator } from 'src/processes/order';

@Injectable()
export class CustomerOrdersRoleService {
  constructor(
    @Inject(ORDER_PROCESS_ORCHESTRATOR) 
    private readonly orderProcess: OrderProcessOrchestrator,
  ) {}

  async checkout(customerId: string, dto: CheckoutDto) {
    return this.orderProcess.checkout({
      customerId,
      customerName: dto.customerName,
      shopId: dto.shopId,
      deliveryAddress: dto.deliveryAddress,
      customerComment: dto.comment,
    });
  }
}
```

---

## TODO

1. **Интеграция с финансовым модулем:**
   - Создание SettlementTransaction при доставке
   - Расчёт комиссии платформы

2. **Бонусные баллы:**
   - Начисление при компенсации недовеса
   - Использование при checkout
   - Возврат при отмене

3. **Возвраты:**
   - Интеграция с платёжным провайдером
   - Частичные возвраты при недоступности товаров

4. **Уведомления:**
   - Push-уведомления клиенту
   - Telegram-уведомления сотрудникам

---

## Связанные файлы

- **Документация процесса:** `docs/processes/order-flow.md`
- **Модуль заказов:** `src/modules/order/`
- **Оркестратор:** `src/processes/order/order-process.orchestrator.ts`
- **Типы:** `src/processes/order/order-process.types.ts`
