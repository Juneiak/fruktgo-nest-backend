# Модуль Finance

**Путь:** `src/modules/finance/`
**Оркестратор:** `src/processes/finance/`

Объединённый модуль для всей финансовой логики платформы.

---

## Структура

```
src/modules/finance/
├── index.ts                    # Экспорты
├── finance.module.ts           # Главный модуль
│
├── shop-account/               # Счета магазинов
│   ├── schemas/
│   │   ├── shop-account.schema.ts
│   │   ├── settlement-period.schema.ts
│   │   └── settlement-period-transaction.schema.ts
│   ├── shop-account.module.ts
│   ├── shop-account.service.ts
│   └── roles/                  # API для ролей
│
├── seller-account/             # Счета продавцов
│   ├── schemas/
│   │   ├── seller-account.schema.ts
│   │   └── withdrawal-request.schema.ts
│   ├── seller-account.module.ts
│   ├── seller-account.service.ts
│   └── roles/
│
├── order-payment/              # Платежи (ЮKassa)
│   ├── order-payment.schema.ts
│   ├── order-payment.module.ts
│   └── order-payment.service.ts
│
├── penalty/                    # Штрафы
│   ├── penalty.schema.ts
│   ├── penalty.module.ts
│   ├── penalty.service.ts
│   └── roles/
│
├── refund/                     # Возвраты
│   ├── refund.schema.ts
│   └── refund.module.ts
│
└── commission/                 # Расчёт комиссий
    ├── commission.enums.ts
    ├── commission.types.ts
    ├── commission.service.ts
    ├── commission.module.ts
    └── index.ts
```

---

## Подмодули

### 1. ShopAccount — Счета магазинов

**Сущности:**
- `ShopAccount` — финансовый счёт магазина
- `SettlementPeriod` — расчётный период (14-21 день)
- `SettlementPeriodTransaction` — транзакции в периоде

**Статусы периода:**
```typescript
enum SettlementPeriodStatus {
  ACTIVE = 'active',                  // Идёт накопление
  PENDING_APPROVAL = 'pending_approval', // На проверке
  RELEASED = 'released'               // Одобрен, деньги у продавца
}
```

**Типы транзакций:**
```typescript
enum SettlementPeriodTransactionType {
  ORDER_INCOME = 'order_income',      // Доход от заказа
  BONUS = 'bonus',                    // Бонус от платформы
  CORRECTION_IN = 'correction_in',    // Корректировка в плюс
  PENALTY = 'penalty',                // Штраф
  ORDER_REFUND = 'order_refund',      // Возврат
  PAYOUT = 'payout',                  // Перевод в SellerAccount
  COMMISSION = 'commission',          // Комиссия платформы
  CORRECTION_OUT = 'correction_out',  // Корректировка в минус
}
```

### 2. SellerAccount — Счета продавцов

**Сущности:**
- `SellerAccount` — баланс продавца (сумма со всех магазинов)
- `WithdrawalRequest` — заявки на вывод средств

**Статусы вывода:**
```typescript
enum WithdrawalRequestStatus {
  PENDING = 'pending',        // Ожидает обработки
  PROCESSING = 'processing',  // В обработке
  COMPLETED = 'completed',    // Завершён
  REJECTED = 'rejected',      // Отклонён
  FAILED = 'failed',          // Ошибка
}
```

### 3. OrderPayment — Платежи через ЮKassa

**Двухшаговая оплата:**
1. Клиент оплачивает → `PENDING` → `WAITING_FOR_CAPTURE`
2. Магазин принимает заказ → `capture()` → `SUCCEEDED`
3. Если отменён до capture → `cancel()` → деньги разблокируются

**Статусы:**
```typescript
enum OrderPaymentStatus {
  PENDING = 'pending',
  WAITING_FOR_CAPTURE = 'waiting_for_capture',
  SUCCEEDED = 'succeeded',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}
```

### 4. Penalty — Штрафы

**Причины штрафов:**
```typescript
enum PenaltyReason {
  ORDER_DELAY = 'order_delay',           // Задержка заказа (100-500₽)
  PRODUCT_QUALITY = 'product_quality',   // Качество товара (200-2000₽)
  PRODUCT_MISMATCH = 'product_mismatch', // Несоответствие (100-1000₽)
  RULE_VIOLATION = 'rule_violation',     // Нарушение правил (500-5000₽)
  OTHER = 'other',
}
```

**Процесс:**
1. Создание штрафа → `CREATED`
2. Селлер оспаривает → `CONTESTED`
3. Админ решает → `CONFIRMED` или `CANCELED`
4. Если `CONFIRMED` → списывается из периода

### 5. Commission — Расчёт комиссий

**Базовые ставки по категориям:**
| Категория | Ставка |
|-----------|--------|
| Овощи/фрукты | 18% |
| Молочка | 20% |
| Мясо/рыба | 22% |
| Бакалея | 20% |
| Готовая еда | 25% |

**Скидки (снижают комиссию):**
- Стаж 6+ мес: -2%
- Оборот 500К+/мес: -2%
- Рейтинг 4.9+: -2%
- Максимум: -10%

**Надбавки (повышают комиссию):**
- Рейтинг <3.5: +3%
- Отмены >10%: +2%
- SLA <80%: +3%
- Максимум: +15%

**Диапазон:** 10-40%
**Минимум:** 50₽ с заказа

---

## Денежный поток

```
┌─────────────────┐
│  Клиент платит  │
│  (OrderPayment) │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Заказ завершён │
│  Transaction    │
│  +orderPayments │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Период закрыт   │
│ PENDING_APPROVAL│
└────────┬────────┘
         ↓
┌─────────────────┐
│ Админ одобряет  │
│ status=RELEASED │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Деньги → Seller │
│ SellerAccount   │
│ balance += X    │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Продавец просит │
│ вывод (Withdraw)│
└────────┬────────┘
         ↓
┌─────────────────┐
│ Банк продавца   │
└─────────────────┘
```

---

## Использование

```typescript
import { 
  FinanceModule,
  ShopAccountService,
  SellerAccountService,
  OrderPaymentService,
  CommissionService,
  PenaltyService,
} from 'src/modules/finance';

// Расчёт комиссии
const commission = commissionService.calculateCommission(
  revenue,
  ProductCategory.PRODUCE,
  shopMetrics,
);

// Создание платежа
const { payment, confirmationUrl } = await orderPaymentService.createPayment({
  orderId,
  shopAccountId,
  amount: 1500,
  returnUrl: 'https://app.fruktgo.com/orders/123/success',
  description: 'Заказ #123',
});

// Подтверждение платежа после принятия заказа
await orderPaymentService.capturePayment(paymentId);

// Создание штрафа
await penaltyService.createPenalty({
  shopAccountId,
  amount: 200,
  reason: PenaltyReason.ORDER_DELAY,
  description: 'Заказ #123 опоздал на 30 минут',
});
```

---

## Порты

```typescript
// Счета магазинов
import { SHOP_ACCOUNT_PORT, ShopAccountPort } from 'src/modules/finance';
@Inject(SHOP_ACCOUNT_PORT) private shopAccountPort: ShopAccountPort

// Счета продавцов
import { SELLER_ACCOUNT_PORT, SellerAccountPort } from 'src/modules/finance';
@Inject(SELLER_ACCOUNT_PORT) private sellerAccountPort: SellerAccountPort

// Счёт платформы
import { PLATFORM_ACCOUNT_PORT, PlatformAccountPort } from 'src/modules/finance';
@Inject(PLATFORM_ACCOUNT_PORT) private platformAccountPort: PlatformAccountPort
```

---

## Оркестраторы

### FinanceProcessOrchestrator

**Путь:** `src/processes/finance/`

Координирует сложные финансовые операции:

```typescript
import { FINANCE_PROCESS_ORCHESTRATOR } from 'src/processes/finance';
@Inject(FINANCE_PROCESS_ORCHESTRATOR) private financeProcess: FinanceProcessOrchestrator

// Закрытие расчётного периода (+ автооткрытие нового)
await financeProcess.closeSettlementPeriod(periodId);

// Одобрение периода (+ перевод на SellerAccount)
await financeProcess.approveSettlementPeriod(periodId, comment);

// Создание заявки на вывод
await financeProcess.createWithdrawalRequest(sellerId, amount);

// Одобрение вывода (+ списание с баланса)
await financeProcess.approveWithdrawal(withdrawalId, externalTxId);

// Запись дохода от заказа (комиссия из ShopAccount.commissionPercent)
await financeProcess.recordOrderIncome({ shopAccountId, orderId, orderAmount });

// Обработка возврата
await financeProcess.processRefund({ shopAccountId, orderId, refundAmount, reason });

// Начисление штрафа
await financeProcess.applyPenalty({ shopAccountId, amount, reason, description });
```

### ShopProcessOrchestrator

**Путь:** `src/processes/shop/`

Координирует создание магазинов с финансовыми счетами:

```typescript
import { SHOP_PROCESS_ORCHESTRATOR } from 'src/processes/shop';
@Inject(SHOP_PROCESS_ORCHESTRATOR) private shopProcess: ShopProcessOrchestrator

// Создание магазина с ShopAccount + первый SettlementPeriod
const result = await shopProcess.createShop({
  sellerId,
  shopName,
  city,
  address,
});
// result: { shop, shopAccountId, settlementPeriodId }
```

### FinanceScheduler

**Путь:** `src/processes/finance/finance-scheduler.service.ts`

Scheduled jobs:
- **Каждый день 00:05** — закрытие истёкших расчётных периодов
- **Каждые 6 часов** — логирование финансовой статистики

---

## Интеграции

### При регистрации продавца (RegistrationOrchestrator)
1. Создаётся `SellerAccount` (финансовый счёт продавца)
2. Создаётся `Seller` с привязкой к `SellerAccount`

### При создании магазина (ShopProcessOrchestrator)
1. Создаётся `ShopAccount` (финансовый счёт магазина)
2. Открывается первый `SettlementPeriod`
3. Создаётся `Shop` с привязкой к `ShopAccount`

### При доставке заказа (OrderProcessOrchestrator)
1. `recordOrderIncome()` — создаёт транзакции:
   - `ORDER_INCOME` (доход продавца)
   - `COMMISSION` (комиссия платформы)
   - `COMMISSION_INCOME` (на PlatformAccount)

### При capture платежа (OrderPaymentService)
1. `ACQUIRING_INCOME` — поступление на PlatformAccount

---

## Связанные процессы

- `docs/processes/finance-flow.md` — Финансовые расчёты
- `docs/processes/payment-flow.md` — Оплата через ЮKassa
- `docs/processes/commission-flow.md` — Расчёт комиссий

---

## Бизнес-правила

1. **Период автоматически закрывается** по endDate (FinanceScheduler)
2. **Новый период создаётся** автоматически при закрытии предыдущего
3. **Деньги доступны к выводу** только после RELEASED
4. **Минимальный вывод:** 1000₽
5. **Штрафы можно оспорить** в течение 7 дней
6. **Комиссия рассчитывается** из `ShopAccount.commissionPercent` (10% по умолчанию)
7. **Закрытый период не изменяется** — корректировки через транзакции
8. **SellerAccount создаётся** при регистрации продавца
9. **ShopAccount создаётся** при создании магазина
