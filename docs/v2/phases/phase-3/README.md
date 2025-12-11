# Фаза 3: Engagement

> Удержание клиентов: лояльность, маркетинг, отзывы, поддержка.

**Длительность:** 2-3 недели

**Зависимости:** Требует Фазы 1 (CUSTOMER) и Фазы 2 (FINANCE)

---

## Цели

1. Клиент получает баллы и карточку лояльности
2. Работают промокоды и акции
3. Клиент может оставить отзыв
4. Клиент может обратиться в поддержку

---

## Этапы

| Этап | Название | Модули | Что делаем |
|------|----------|--------|------------|
| 1 | Лояльность | LOYALTY | MemberCard, баллы, тиры, QR |
| 2 | Маркетинг | MARKETING | Промокоды, акции, баннеры |
| 3 | Отзывы | REPUTATION | Отзывы, рейтинги, модерация |
| 4 | Поддержка | SUPPORT | Тикеты, споры (Dispute), арбитраж |
| 5 | Доверие | CUSTOMER | CustomerTrustScore полный |

---

## Этап 1: Лояльность (LOYALTY)

**Сущности:** MemberCard

**Задачи:**
- MemberCard: barcode, balance, tier
- Начисление баллов (за недовес, кэшбэк)
- Списание при оплате
- QR endpoint для показа карточки
- Лимиты (антиабьюз)

**Детали:** [stage-1.md](./stage-1.md) *(после утверждения)*

---

## Этап 2: Маркетинг (MARKETING)

**Сущности:** Promo, Campaign, Banner

**Задачи:**
- Промокоды: типы скидок, условия, лимиты
- Акции: "2 по цене 1", happy hours
- Баннеры: главная, категории
- Anti-abuse: лимит на клиента/IP

**Детали:** [stage-2.md](./stage-2.md) *(после утверждения)*

---

## Этап 3: Отзывы (REPUTATION)

**Сущности:** ProductReview, ShopReview

**Задачи:**
- Отзывы на товары и магазины
- Рейтинги (агрегация)
- Проверка покупки перед отзывом
- Модерация
- Баллы за отзывы (→ LOYALTY)

**Детали:** [stage-3.md](./stage-3.md) *(после утверждения)*

---

## Этап 4: Поддержка (SUPPORT)

**Сущности:** Issue, Dispute

**Задачи:**
- Тикеты (Issue) → связка с Telegram
- **Споры (Dispute):** арбитраж возвратов
- SLA и эскалация
- FAQ (база знаний)

**Dispute схема:**
```typescript
Dispute {
  orderId: ObjectId;
  customerId: ObjectId;
  shopId: ObjectId;
  reason: DisputeReason;    // quality, missing_item, wrong_item, damaged, weight_mismatch
  status: DisputeStatus;    // opened, under_review, resolved, escalated
  evidence: {
    customerPhotos: string[];
    customerComment: string;
    sellerPhotos: string[];
    sellerComment: string;
  };
  resolution?: {
    decision: 'customer_favor' | 'seller_favor' | 'partial';
    refundAmount?: number;
    bonusCompensation?: number;
    resolvedBy: ObjectId;
    comment: string;
  };
}
```

**Правила арбитража:**
- Приоритет клиента при высоком TrustScore (>70)
- Авторазрешение мелких споров (<1000₸)
- Эскалация при сумме >5000₸
- Штрафы магазину при частых проигрышах

**Детали:** [stage-4.md](./stage-4.md)

---

## Этап 5: Рейтинг доверия (CUSTOMER)

**Сущность:** CustomerTrust

**Задачи:**
- CustomerTrust схема (score, disputes, fraudFlags)
- Автопересчёт после заказа/спора
- Влияние на лимиты и арбитраж
- Интеграция с SUPPORT

**Схема:**
```typescript
CustomerTrust {
  customerId: ObjectId;
  score: number;           // 0-100, начальный = 50
  totalOrders: number;
  completedOrders: number;
  disputesOpened: number;
  disputesWonByCustomer: number;
  disputesWonBySeller: number;
  fraudFlags: string[];
  lastUpdated: Date;
}
```

**Влияние score:**
| Score | Эффект |
|-------|--------|
| >70 | Приоритет в спорах, авторазрешение |
| 50-70 | Стандартные условия |
| 30-50 | Строже проверки |
| <30 | Только ручное рассмотрение споров |

**Детали:** [stage-5.md](./stage-5.md)

---

## Ключевые требования

- **Observability:** Prometheus метрики
- **Anti-abuse:** лимиты на промо и отзывы
- **Feature flags:** для поэтапного включения
- **TrustScore:** автоматический пересчёт

---

## Критерии готовности

- [ ] MemberCard с QR работает
- [ ] Промокоды применяются при checkout
- [ ] Отзывы с проверкой покупки
- [ ] Тикеты создаются и видны в Telegram
- [ ] Споры (Dispute) работают с арбитражем
- [ ] CustomerTrustScore пересчитывается
