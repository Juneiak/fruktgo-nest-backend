# Процесс: Финансовые расчёты и выплаты

**Участники:** Shop, Seller, PlatformStaff  
**Зависимости:** ShopAccount, SellerAccount, SettlementPeriod, Penalty

---

## Обзор

Система финансовых расчётов между платформой и селлерами по **расчётным периодам** с учётом комиссий, штрафов и бонусов.

**Принципы:**
- Каждый магазин имеет свой `ShopAccount` с расчётными периодами
- Периоды фиксируют все транзакции за время (обычно 2-3 недели)
- По закрытии периода деньги переходят в `SellerAccount`
- Селлер запрашивает вывод на свой банковский счёт

---

## Расчётный период (SettlementPeriod)

### Жизненный цикл

```
ACTIVE (идёт накопление) → PENDING_APPROVAL (на проверке) → RELEASED (одобрен)
```

### Структура периода

```typescript
{
  shopAccount: ObjectId,
  periodNumber: 5,  // Порядковый номер для магазина
  startDate: Date,
  endDate: Date,
  status: "ACTIVE",
  periodDurationDays: 14,  // Обычно 14-21 день
  
  amounts: {
    orderPayments: 150000,    // Оплаты за заказы
    refunds: -5000,           // Возвраты
    penalties: -3000,         // Штрафы
    commissions: -30000,      // Комиссия платформы (20%)
    bonus: 2000,              // Бонусы
    correctionsIn: 0,         // Ручные пополнения
    correctionsOut: 0         // Ручные списания
  },
  
  totalAmount: 114000,  // К выплате селлеру
  transactions: [...],  // Связанные транзакции
  penalties: [...]      // Связанные штрафы
}
```

---

## 1. Накопление транзакций

**Актор:** Система (автоматически)

### Сценарий

Во время активного периода автоматически учитываются:

#### Пополнения (+)

1. **Оплаченные заказы:**
   - Клиент оплатил → `OrderPayment` создан
   - Заказ доставлен → `+orderPayments`
   - Сумма: полная стоимость заказа (без вычета комиссии)

2. **Бонусы:**
   - Высокий рейтинг магазина (>4.8) → +1% от оборота
   - Выполнение KPI (SLA, мало отмен) → +500₽/день
   - Акции платформы → индивидуально

3. **Ручные корректировки (+):**
   - Компенсации от платформы
   - Исправление ошибок

#### Списания (-)

1. **Комиссия платформы:**
   - Базовая: 20% от orderPayments
   - Динамическая корректировка:
     ```
     Снижение:
     - 6+ месяцев работы: -2%
     - Оборот >500к/мес: -1%
     - Рейтинг >4.9: -1%
     
     Повышение:
     - Много жалоб: +3-5%
     - Нарушения SLA: +2%
     - Рейтинг <3.5: +3%
     ```
   - Минимум 50₽ с заказа <500₽

2. **Возвраты:**
   - Клиент вернул товар → `-refunds`
   - Полная сумма заказа списывается

3. **Штрафы (Penalty):**
   - См. раздел "Система штрафов"

4. **Ручные корректировки (-):**
   - Компенсации клиентам за счёт магазина
   - Другие удержания

---

## 2. Система штрафов

**Актор:** PlatformStaff или Система

### Причины штрафов

| Причина | Код | Сумма | Автоматически? |
|---------|-----|-------|----------------|
| **Задержка заказа** | `ORDER_DELAY` | 100-500₽ | ✅ Да |
| **Плохое качество** | `PRODUCT_QUALITY` | 200-2000₽ | ❌ Ручной |
| **Несоответствие товара** | `PRODUCT_MISMATCH` | 100-1000₽ | ❌ Ручной |
| **Нарушение правил** | `RULE_VIOLATION` | 500-5000₽ | ❌ Ручной |
| **Другое** | `OTHER` | Индивидуально | ❌ Ручной |

### Процесс наложения штрафа

1. **Создание штрафа:**
   ```typescript
   {
     shopAccount: shopAccountId,
     amount: 500,
     reason: "ORDER_DELAY",
     description: "Заказ #12345 опоздал на 2 часа",
     status: "CREATED",
     references: {
       orderId: "12345"
     }
   }
   ```

2. **Оспаривание (опционально):**
   - Селлер видит штраф в панели
   - Может оспорить: `status = CONTESTED`
   - Указывает причину: `sellerContest`
   - Админ рассматривает

3. **Решение админа:**
   - **Подтвердить:** `status = CONFIRMED` → привязка к периоду
   - **Отменить:** `status = CANCELED` → не учитывается

4. **Учёт в периоде:**
   ```typescript
   settlementPeriod.amounts.penalties -= penalty.amount
   settlementPeriod.totalAmount -= penalty.amount
   ```

---

## 3. Закрытие периода

**Актор:** Система (по расписанию)

### Сценарий

1. **Автоматическое закрытие:**
   - Cron job каждый день в 00:00
   - Проверка: `endDate <= now`
   - Переход: `ACTIVE → PENDING_APPROVAL`

2. **Финализация сумм:**
   ```typescript
   totalAmount = 
     orderPayments 
     - refunds 
     - penalties 
     - commissions 
     + bonus 
     + correctionsIn 
     - correctionsOut
   ```

3. **Создание нового периода:**
   ```typescript
   {
     periodNumber: previousNumber + 1,
     startDate: previousEndDate + 1 день,
     endDate: startDate + periodDurationDays,
     status: "ACTIVE"
   }
   ```

---

## 4. Проверка и одобрение

**Актор:** PlatformStaff

### Сценарий

1. **Админ в панели:** `/platform/settlement-periods`
2. **Фильтр:** `status = PENDING_APPROVAL`
3. **Проверка:**
   - Корректность транзакций
   - Обоснованность штрафов
   - Правильность комиссии
   - Отсутствие спорных моментов

4. **Одобрение:**
   ```typescript
   {
     status: "RELEASED",
     releasedAt: new Date(),
     releasedAmount: totalAmount
   }
   ```

5. **Перевод в SellerAccount:**
   ```typescript
   sellerAccount.balance += settlementPeriod.releasedAmount
   sellerAccount.totalEarned += settlementPeriod.releasedAmount
   ```

**API:** `PATCH /platform/settlement-periods/:id/release`

---

## 5. Запрос на вывод средств

**Актор:** Seller

### Сценарий

1. **Селлер в панели:** `/seller/finance` → видит баланс
2. **Создание заявки на вывод:**
   ```typescript
   {
     sellerAccount: sellerAccountId,
     amount: 50000,  // Не больше balance
     bankDetails: {
       bankName: "Сбербанк",
       bik: "044525225",
       accountNumber: "40702810123450101230",
       recipientName: "ООО Фруктовая база"
     },
     status: "PENDING"
   }
   ```

3. **Минимальная сумма:** 1000₽
4. **Комиссия за вывод:** 0₽ (платформа берёт на себя)
5. **Частота:** не чаще 1 раза в день

**API:** `POST /seller/withdrawals`

---

## 6. Обработка вывода

**Актор:** PlatformStaff + Банк

### Сценарий

1. **Админ проверяет заявки:** `/platform/withdrawals`
2. **Валидация:**
   - Корректность реквизитов
   - Достаточность баланса
   - Отсутствие блокировок
   
3. **Формирование платёжки:**
   - Экспорт в банк-клиент
   - Или API банка-партнёра
   
4. **Отправка в банк:**
   ```typescript
   {
     status: "PROCESSING",
     processedAt: new Date()
   }
   ```

5. **Подтверждение от банка:**
   ```typescript
   {
     status: "COMPLETED",
     completedAt: new Date(),
     transactionId: "BANK_123456"
   }
   ```

6. **Обновление баланса:**
   ```typescript
   sellerAccount.balance -= withdrawal.amount
   sellerAccount.totalWithdrawn += withdrawal.amount
   ```

**API:** 
- `PATCH /platform/withdrawals/:id/process`
- `PATCH /platform/withdrawals/:id/complete`

---

## Динамическая комиссия

### Базовая ставка

| Категория товаров | Комиссия |
|-------------------|----------|
| Продукты | 20% |
| Напитки | 18% |
| Бытовая химия | 22% |
| Прочее | 25% |

### Корректировки

**Понижающие (-%):**
- Стаж 3+ мес: -1%
- Стаж 6+ мес: -2%
- Стаж 12+ мес: -3%
- Оборот >300к/мес: -1%
- Оборот >500к/мес: -2%
- Оборот >1млн/мес: -3%
- Рейтинг 4.7+: -1%
- Рейтинг 4.9+: -2%
- SLA выполнение >95%: -1%

**Повышающие (+%):**
- Рейтинг <3.5: +3%
- Рейтинг <3.0: +5%
- Много жалоб (>5% заказов): +3%
- Отмены >10%: +2%
- SLA выполнение <80%: +3%
- Штрафы >10% от оборота: +5%

**Итоговая формула:**
```
finalCommission = baseRate + corrections
min: 10%
max: 40%
```

---

## Бонусная система

### Автоматические бонусы

1. **За качество:**
   - Рейтинг 4.8+: +0.5% от оборота
   - Рейтинг 4.9+: +1% от оборота
   - 0 жалоб за период: +500₽

2. **За объём:**
   - 100+ заказов: +1000₽
   - 500+ заказов: +5000₽
   - 1000+ заказов: +12000₽

3. **За скорость:**
   - Среднее принятие <2 мин: +1000₽
   - Средняя сборка <10 мин: +1000₽

### Ручные бонусы

- Участие в акциях платформы
- Компенсации за технические сбои
- Поощрения за особые достижения

---

## Финансовые счета

### ShopAccount

```typescript
{
  shop: ObjectId,
  balance: 0,  // Текущий баланс (не используется в MVP)
  totalEarned: 250000,
  totalCommission: 50000,
  totalPenalties: 3000,
  settlementPeriods: [...]  // Связанные периоды
}
```

### SellerAccount

```typescript
{
  seller: ObjectId,
  balance: 114000,  // Доступно к выводу
  frozenBalance: 0,  // Заморожено (споры)
  totalEarned: 2500000,
  totalWithdrawn: 2386000,
  bankDetails: {...},
  withdrawals: [...]  // История выводов
}
```

---

## Техническая сводка

### Модули

- `finance/shop-account` - счета магазинов
- `finance/seller-account` - счета селлеров
- `finance/settlement-period` - расчётные периоды
- `finance/penalty` - штрафы
- `finance/withdrawal` - выводы средств

### API

**Seller:**
- `GET /seller/finance` - баланс и история
- `GET /seller/settlement-periods` - периоды магазинов
- `POST /seller/penalties/:id/contest` - оспорить штраф
- `POST /seller/withdrawals` - запрос на вывод

**Platform:**
- `GET /platform/settlement-periods` - все периоды
- `PATCH /platform/settlement-periods/:id/release` - одобрить
- `POST /platform/penalties` - создать штраф
- `PATCH /platform/penalties/:id/confirm` - подтвердить
- `GET /platform/withdrawals` - заявки на вывод
- `PATCH /platform/withdrawals/:id/process` - обработать

### Бизнес-правила

1. **Период автоматически закрывается** по достижении endDate
2. **Новый период создаётся** автоматически при закрытии предыдущего
3. **Деньги доступны к выводу** только после RELEASED
4. **Минимальный вывод:** 1000₽
5. **Штрафы можно оспорить** в течение 7 дней
6. **Комиссия рассчитывается** на момент закрытия периода
7. **Бонусы начисляются** автоматически по метрикам
8. **Корректировки** только с указанием причины

---

## Примеры

### Расчёт периода

```typescript
// Магазин за 2 недели:
orderPayments: 150000₽  // Продал товаров
refunds: -5000₽         // Вернули товар
penalties: -3000₽       // Штраф за задержки

// Комиссия (базовая 20% - скидка 2% за стаж):
commissions: 150000 * 0.18 = -27000₽

// Бонус за рейтинг 4.9:
bonus: 150000 * 0.01 = +1500₽

// Итого к выплате:
total = 150000 - 5000 - 3000 - 27000 + 1500 = 116500₽
```

### Штраф за задержку

```typescript
// Автоматический штраф
if (order.deliveredAt > order.promisedAt + 30min) {
  createPenalty({
    shopAccount: order.shop.account,
    amount: 200,
    reason: "ORDER_DELAY",
    description: `Заказ #${orderId} опоздал на ${delay} минут`
  });
}
```

---

## Связь с другими процессами

**Payment Flow:**
- Успешная оплата → +orderPayments в периоде
- Возврат → -refunds в периоде

**Order Flow:**
- Завершённый заказ → транзакция в периоде
- Отменённый заказ → возможен штраф

**Shift Flow:**
- Метрики смены → расчёт бонусов

---

> **Статус:** ✅ Готов  
> **Обновлено:** 2024-11-24
