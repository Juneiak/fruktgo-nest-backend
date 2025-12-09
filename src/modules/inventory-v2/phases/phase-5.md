# Фаза 5: Возвраты

> **Срок:** 2-3 дня  
> **Зависимости:** Фаза 3 (нужны Batch, BatchLocation, Movement, WriteOff)

---

## Что делаем в этой фазе

**Return** — возвраты товара (от клиента, курьера, поставщику)

---

## Зачем это нужно (простыми словами)

Товар может вернуться обратно:

1. **Возврат от клиента** — "Яблоки гнилые, заберите обратно"
2. **Возврат от курьера** — клиент не открыл дверь, курьер привёз обратно
3. **Возврат поставщику** — "Вы привезли брак, забирайте"

Что делать с возвращённым товаром?
- Если свежий → вернуть на полку
- Если подозрительный → со скидкой
- Если испорчен → списать

---

## Порядок разработки

### Шаг 1: Return (возврат)

**Файлы:**
- `operations/return/return.schema.ts`
- `operations/return/return.enums.ts`
- `operations/return/return.commands.ts`
- `operations/return/return.queries.ts`
- `operations/return/return.port.ts`
- `operations/return/return.service.ts`
- `operations/return/return.module.ts`

**Типы возвратов:**

```
CUSTOMER_RETURN — от клиента (самый частый)
DELIVERY_RETURN — курьер не доставил
SUPPLIER_RETURN — возврат поставщику
```

**Основные поля:**

```typescript
seller: ObjectId
documentNumber: string      // "RET-2024-12-05-001"

type: ReturnType            // CUSTOMER_RETURN, DELIVERY_RETURN, SUPPLIER_RETURN

// Откуда возврат
order: ObjectId             // Связанный заказ (для CUSTOMER/DELIVERY)

// Куда возвращаем
storageLocation: ObjectId   // Локация возврата

// Позиции
items: [{
  batch: ObjectId
  productTemplate: ObjectId
  quantity: number
  
  // Оценка состояния (заполняется при проверке)
  minutesOutOfControl: number   // Время вне контроля
  condition: ItemCondition      // EXCELLENT, GOOD, SATISFACTORY, UNSATISFACTORY
  
  // Решение (заполняется при проверке)
  decision: ReturnDecision
  discountPercent: number       // Если RETURN_WITH_DISCOUNT
  
  // После решения
  newEffectiveExpiration: Date  // Пересчитанный срок
  writeOffId: ObjectId          // Если WRITE_OFF
}]

// Причина возврата
reason: string
photos: ObjectId[]              // Фото товара

status: ReturnStatus
createdBy: ObjectId
inspectedBy: ObjectId           // Кто проверил
inspectedAt: Date
completedBy: ObjectId
completedAt: Date
```

**Состояние товара (ItemCondition):**
```
EXCELLENT      — отлично (как новый)
GOOD           — хорошо (мелкие дефекты)
SATISFACTORY   — удовлетворительно (заметные дефекты)
UNSATISFACTORY — неудовлетворительно (негоден)
```

**Решения по возврату (ReturnDecision):**
```
RETURN_TO_SHELF      — вернуть на полку (без скидки)
RETURN_WITH_DISCOUNT — вернуть со скидкой
WRITE_OFF            — списать
```

**Статусы возврата:**
```
PENDING_INSPECTION — ожидает проверки
INSPECTED          — проверен, решения приняты
COMPLETED          — завершён
REJECTED           — отклонён (для SUPPLIER_RETURN)
```

---

### Шаг 2: Матрица решений

**Как определить, что делать с товаром?**

Зависит от:
1. Времени вне контроля (minutesOutOfControl)
2. Визуального состояния (condition)
3. Типа товара (скоропорт vs консервы)

**Матрица для скоропортящихся:**

| Время вне контроля | EXCELLENT | GOOD | SATISFACTORY | UNSATISFACTORY |
|-------------------|-----------|------|--------------|----------------|
| < 30 минут | На полку | На полку | Скидка 20% | Списать |
| 30-60 минут | На полку | Скидка 10% | Скидка 30% | Списать |
| 60-120 минут | Скидка 10% | Скидка 20% | Скидка 50% | Списать |
| > 120 минут | Скидка 20% | Скидка 40% | Списать | Списать |

**Матрица для длительного хранения:**

| Время вне контроля | EXCELLENT | GOOD | SATISFACTORY | UNSATISFACTORY |
|-------------------|-----------|------|--------------|----------------|
| < 4 часов | На полку | На полку | Скидка 10% | Списать |
| 4-8 часов | На полку | Скидка 10% | Скидка 20% | Списать |
| > 8 часов | Скидка 10% | Скидка 20% | Скидка 30% | Списать |

**Пересчёт срока при возврате:**

Если товар был вне контроля (не в холодильнике), нужно пересчитать срок:

```
Клубника вернулась через 2 часа:

До возврата:
├── freshnessRemaining: 5.0 дней
└── effectiveExpirationDate: 10.12

Пересчёт:
├── Вне контроля: 2 часа при комнатной (коэф. 1.5)
├── Потрачено: 2/24 × 1.5 = 0.125 дня
├── Новая свежесть: 5.0 - 0.125 = 4.875 дня
└── Новый срок: пересчитать с учётом локации возврата
```

---

### Шаг 3: Workflow возврата

```
1. СОЗДАНИЕ (status: PENDING_INSPECTION)
   ├── Указываем тип (CUSTOMER/DELIVERY/SUPPLIER)
   ├── Связываем с заказом (если есть)
   ├── Добавляем позиции
   └── Прикрепляем фото

2. ПРОВЕРКА (status: INSPECTED)
   Для каждой позиции:
   │
   ├── a) Оцениваем состояние (condition)
   │
   ├── b) Указываем время вне контроля
   │
   ├── c) Система предлагает решение (по матрице)
   │   └── Сотрудник может изменить
   │
   └── d) Пересчитываем срок (если не WRITE_OFF)

3. ЗАВЕРШЕНИЕ (status: COMPLETED)
   Для каждой позиции по decision:
   │
   ├── RETURN_TO_SHELF:
   │   ├── Создаём/обновляем BatchLocation
   │   ├── Обновляем Batch.freshnessRemaining
   │   ├── Обновляем Batch.effectiveExpirationDate
   │   └── Movement type = RETURN_TO_STOCK
   │
   ├── RETURN_WITH_DISCOUNT:
   │   ├── То же, что RETURN_TO_SHELF
   │   ├── Помечаем партию для скидки
   │   └── Обновляем StorefrontProduct.pricing.discount
   │
   └── WRITE_OFF:
       ├── Создаём документ WriteOff
       └── Movement type = WRITE_OFF (через WriteOff)
```

**Пример возврата от клиента:**

```
Возврат #RET-001:
├── Тип: CUSTOMER_RETURN
├── Заказ: #ORD-12345
├── Причина: "Клубника подавленная"
│
├── Позиция 1: Клубника, Партия P-015, 2 кг
│   ├── Время вне контроля: 45 минут
│   ├── Состояние: SATISFACTORY (помятая)
│   ├── Система предлагает: Скидка 30%
│   ├── Решение: RETURN_WITH_DISCOUNT (30%)
│   ├── Новый срок: 08.12 (было 09.12)
│   └── → На витрину со скидкой
│
└── Позиция 2: Яблоки, Партия P-010, 1 кг
    ├── Время вне контроля: 45 минут
    ├── Состояние: EXCELLENT (как новые)
    ├── Система предлагает: На полку
    ├── Решение: RETURN_TO_SHELF
    └── → Обратно на витрину
```

---

## Структура файлов после Фазы 5

```
src/modules/new-inventory/
├── ...                      # Из предыдущих фаз
│
└── operations/
    ├── receiving/           # Из Фазы 3
    ├── transfer/            # Из Фазы 3
    ├── write-off/           # Из Фазы 3
    ├── audit/               # Из Фазы 4
    │
    └── return/              # НОВОЕ
        ├── return.schema.ts
        ├── return.enums.ts
        ├── return.commands.ts
        ├── return.queries.ts
        ├── return.port.ts
        ├── return.service.ts
        ├── return-decision.service.ts  # Матрица решений
        ├── return.module.ts
        └── index.ts
```

---

## Чек-лист готовности

- [ ] Return — схема с типами и статусами
- [ ] Return — workflow PENDING_INSPECTION → INSPECTED → COMPLETED
- [ ] Return — матрица решений по состоянию и времени
- [ ] Return — пересчёт сроков при возврате
- [ ] Return — интеграция с WriteOff (для WRITE_OFF решения)
- [ ] Return — интеграция с StorefrontProduct (для скидок)
- [ ] Return — связь с заказом (Order)
- [ ] Тесты на все сценарии

---

## Результат Фазы 5

После завершения можно:
1. Оформить возврат от клиента
2. Оформить возврат от курьера
3. Оформить возврат поставщику
4. Автоматически получить рекомендацию (полка/скидка/списать)
5. Пересчитать срок годности с учётом времени вне контроля
