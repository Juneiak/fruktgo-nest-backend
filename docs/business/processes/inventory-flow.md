# Процесс: Складской учёт

**Участники:** Seller, Shop, Employee, PlatformStaff  
**Зависимости:** Product, ShopProduct, StockMovement, InventoryAudit

---

## Обзор

Система управления товарными остатками для магазинов и складов с поддержкой основных операций учёта.

**Масштаб:**
- 5-6 магазинов
- 2 распределительных склада
- ~1000 SKU на точку
- Базовые операции без сложной логистики

**Ключевые возможности:**
- Приёмка товара
- Перемещения между точками
- Списания (брак, просрочка, недостача)
- Инвентаризация
- Импорт данных из внешних систем
- История движения товара

---

## Архитектура складской системы

### Уровни хранения

```
Seller (владелец)
  ├── Warehouse 1 (склад)
  │    └── Products (остатки)
  ├── Warehouse 2 (склад)
  │    └── Products (остатки)
  ├── Shop 1 (магазин)
  │    └── ShopProducts (остатки + продажи)
  ├── Shop 2 (магазин)
  │    └── ShopProducts (остатки + продажи)
  └── Shop 3 (магазин)
       └── ShopProducts (остатки + продажи)
```

### Типы точек хранения

| Тип | Назначение | Операции |
|-----|------------|----------|
| **Warehouse** | Распределительный склад | Приёмка, хранение, отгрузка в магазины |
| **Shop** | Торговая точка | Приёмка, продажа, списание |

---

## 1. Приёмка товара

**Актор:** Employee (кладовщик)

### Сценарий приёмки на склад

1. **Создание документа приёмки:**
   ```typescript
   {
     type: "RECEIVING",
     location: warehouseId,
     supplier: "ООО Поставщик",
     invoiceNumber: "ПН-12345",
     plannedItems: [
       { productId, quantity: 100, price: 50 }
     ],
     status: "DRAFT"
   }
   ```

2. **Фактическая приёмка:**
   - Сканирование/ввод товаров
   - Проверка качества
   - Указание фактического количества
   - Указание сроков годности (для скоропорта)

3. **Расхождения:**
   ```typescript
   {
     plannedQuantity: 100,
     actualQuantity: 98,
     discrepancy: -2,
     discrepancyReason: "Повреждение при транспортировке"
   }
   ```

4. **Подтверждение:**
   ```typescript
   {
     status: "COMPLETED",
     completedAt: new Date(),
     completedBy: employeeId
   }
   ```

5. **Обновление остатков:**
   ```typescript
   warehouseStock.quantity += actualQuantity
   warehouseStock.lastReceivingDate = new Date()
   ```

**API:** 
- `POST /warehouse/receiving` - создать приёмку
- `PATCH /warehouse/receiving/:id/complete` - завершить

### Сценарий прямой поставки в магазин

Аналогично, но:
- `location: shopId`
- Обновляется `shopProduct.stockQuantity`
- Товар сразу доступен для продажи

---

## 2. Перемещение между точками

**Актор:** Employee (кладовщик/менеджер)

### Сценарий: Склад → Магазин

1. **Создание заявки (из магазина):**
   ```typescript
   {
     type: "TRANSFER_REQUEST",
     from: warehouseId,
     to: shopId,
     items: [
       { productId, requestedQuantity: 50 }
     ],
     status: "PENDING"
   }
   ```

2. **Подтверждение складом:**
   ```typescript
   {
     status: "APPROVED",
     items: [
       { 
         productId,
         requestedQuantity: 50,
         approvedQuantity: 45,  // Может быть меньше
         reason: "Недостаточно на складе"
       }
     ]
   }
   ```

3. **Отгрузка:**
   ```typescript
   {
     type: "TRANSFER_OUT",
     from: warehouseId,
     to: shopId,
     status: "IN_TRANSIT",
     shippedAt: new Date()
   }
   ```

4. **Приёмка в магазине:**
   ```typescript
   {
     status: "COMPLETED",
     receivedAt: new Date(),
     receivedItems: [
       { productId, quantity: 45 }
     ]
   }
   ```

5. **Обновление остатков:**
   ```typescript
   // Склад
   warehouseStock.quantity -= 45
   
   // Магазин
   shopProduct.stockQuantity += 45
   ```

**API:**
- `POST /shop/transfer-requests` - заявка
- `PATCH /warehouse/transfers/:id/approve` - одобрить
- `PATCH /warehouse/transfers/:id/ship` - отгрузить
- `PATCH /shop/transfers/:id/receive` - принять

### Сценарий: Магазин → Магазин

Для срочного пополнения между соседними магазинами:
1. Запрос от магазина-получателя
2. Подтверждение магазином-отправителем
3. Прямое перемещение (без транзита)
4. Обновление остатков в обоих магазинах

---

## 3. Списание товара

**Актор:** Employee

### Причины списания

| Причина | Код | Описание | Требует фото? |
|---------|-----|----------|---------------|
| **Истёк срок** | `EXPIRED` | Просроченный товар | ✅ Да |
| **Брак** | `DAMAGED` | Повреждённый товар | ✅ Да |
| **Недостача** | `SHORTAGE` | Выявлено при инвентаризации | ❌ Нет |
| **Порча** | `SPOILAGE` | Испорченный товар (гниль) | ✅ Да |
| **Кража** | `THEFT` | Хищение | ❌ Нет |
| **Тестирование** | `TESTING` | Проверка качества | ❌ Нет |
| **Другое** | `OTHER` | Иные причины | ❌ Опционально |

### Сценарий списания

1. **Создание акта:**
   ```typescript
   {
     type: "WRITE_OFF",
     location: shopId,
     reason: "EXPIRED",
     items: [
       {
         productId,
         quantity: 5,
         comment: "Истёк срок годности 22.11.2024"
       }
     ],
     photos: ["photo1.jpg", "photo2.jpg"],
     status: "DRAFT"
   }
   ```

2. **Подтверждение менеджером:**
   - Проверка обоснованности
   - Проверка фото (если требуется)
   - Одобрение/отклонение

3. **Проведение:**
   ```typescript
   {
     status: "APPROVED",
     approvedBy: managerId,
     approvedAt: new Date()
   }
   ```

4. **Обновление остатков:**
   ```typescript
   shopProduct.stockQuantity -= quantity
   shopProduct.writeOffQuantity += quantity  // Статистика
   ```

**API:**
- `POST /shop/write-offs` - создать списание
- `PATCH /shop/write-offs/:id/approve` - одобрить

---

## 4. Инвентаризация

**Актор:** Employee + Manager

### Типы инвентаризации

| Тип | Периодичность | Охват |
|-----|---------------|-------|
| **Полная** | 1 раз в квартал | Все товары |
| **Выборочная** | 1 раз в месяц | Случайная выборка 20% |
| **По категории** | По необходимости | Конкретная категория |
| **Внеплановая** | При подозрениях | Любой охват |

### Сценарий инвентаризации

1. **Создание документа:**
   ```typescript
   {
     type: "INVENTORY",
     location: shopId,
     inventoryType: "FULL",
     status: "IN_PROGRESS",
     startedAt: new Date(),
     items: []  // Заполняется в процессе
   }
   ```

2. **Подсчёт товаров:**
   ```typescript
   // Для каждого товара
   {
     productId,
     systemQuantity: 100,  // По данным системы
     actualQuantity: 98,   // Фактически насчитано
     difference: -2,
     status: "COUNTED"
   }
   ```

3. **Анализ расхождений:**
   ```typescript
   {
     totalItems: 150,
     matchedItems: 140,     // Совпадает
     surplusItems: 3,       // Излишки
     shortageItems: 7,      // Недостача
     totalSurplus: 12,      // Штук излишков
     totalShortage: 25,     // Штук недостачи
     totalValue: -1250      // Денежная оценка
   }
   ```

4. **Корректировка остатков:**
   - Автоматическая для расхождений <5%
   - Требует одобрения для >5%
   ```typescript
   // Для каждого расхождения
   if (Math.abs(difference) / systemQuantity < 0.05) {
     shopProduct.stockQuantity = actualQuantity  // Автокорректировка
   } else {
     // Требует решения менеджера
     createAdjustmentRequest(productId, difference)
   }
   ```

5. **Закрытие инвентаризации:**
   ```typescript
   {
     status: "COMPLETED",
     completedAt: new Date(),
     approvedBy: managerId,
     adjustmentDocument: "ИНВ-2024-11-001"
   }
   ```

**API:**
- `POST /shop/inventory` - начать инвентаризацию
- `PATCH /shop/inventory/:id/items` - обновить подсчёт
- `PATCH /shop/inventory/:id/complete` - завершить

---

## 5. Импорт данных

**Актор:** Seller или PlatformStaff

### Поддерживаемые форматы

| Формат | Расширение | Источник | Описание |
|--------|------------|----------|----------|
| **1С** | `.xml` | 1С:Предприятие | CommerceML 2.0 |
| **Excel** | `.xlsx` | Любая система | Шаблон платформы |
| **CSV** | `.csv` | Любая система | Простой формат |
| **МойСклад** | `.json` | МойСклад API | JSON export |

### Сценарий импорта из 1С

1. **Экспорт из 1С:**
   - Выгрузка в формате CommerceML 2.0
   - Файлы: `import.xml`, `offers.xml`

2. **Загрузка на платформу:**
   ```typescript
   {
     type: "IMPORT_1C",
     files: ["import.xml", "offers.xml"],
     mapping: {
       // Маппинг полей 1С на поля системы
       "Номенклатура.Наименование": "name",
       "Номенклатура.Артикул": "sku",
       "ПакетПредложений.Цена": "price",
       "ПакетПредложений.Остаток": "stockQuantity"
     }
   }
   ```

3. **Валидация:**
   ```typescript
   {
     totalItems: 500,
     validItems: 485,
     errors: [
       { line: 45, error: "SKU уже существует" },
       { line: 120, error: "Отрицательный остаток" }
     ]
   }
   ```

4. **Предпросмотр и подтверждение:**
   - Показ первых 10 записей
   - Сводка по категориям
   - Подтверждение импорта

5. **Импорт:**
   ```typescript
   // Для каждого товара
   await createOrUpdateProduct({
     sku: "АРТ-12345",
     name: "Яблоко Гала",
     price: 120,
     stockQuantity: 50,
     externalId: "1c_guid_here"  // Для синхронизации
   })
   ```

**API:**
- `POST /import/upload` - загрузка файлов
- `POST /import/validate` - валидация
- `POST /import/process` - выполнить импорт

### Шаблон Excel

Стандартный шаблон для импорта:

| Артикул | Название | Категория | Ед.изм | Цена | Остаток | Штрихкод |
|---------|----------|-----------|--------|------|---------|----------|
| 12345 | Яблоко Гала | Фрукты | кг | 120 | 50.5 | 4600000000123 |
| 12346 | Банан | Фрукты | кг | 95 | 30 | 4600000000124 |

---

## 6. История движения товара

**Актор:** Любой авторизованный

### StockMovement - запись движения

```typescript
{
  type: "RECEIVING" | "SALE" | "TRANSFER" | "WRITE_OFF" | "ADJUSTMENT",
  product: productId,
  location: shopId | warehouseId,
  quantity: 10,  // Положительное или отрицательное
  balanceBefore: 100,
  balanceAfter: 110,
  document: {
    type: "Order" | "Transfer" | "WriteOff" | "Inventory",
    id: documentId,
    number: "ДОК-12345"
  },
  actor: employeeId,
  comment: "Приёмка по накладной ПН-12345",
  createdAt: Date
}
```

### Просмотр истории

```typescript
// Фильтры
{
  productId?: string,
  location?: string,
  type?: MovementType,
  dateFrom?: Date,
  dateTo?: Date,
  actor?: string
}

// Результат
[
  { type: "RECEIVING", quantity: +100, date: "2024-11-20", ... },
  { type: "SALE", quantity: -5, date: "2024-11-21", ... },
  { type: "TRANSFER", quantity: -20, date: "2024-11-22", ... },
  { type: "WRITE_OFF", quantity: -2, date: "2024-11-23", ... }
]
```

**API:** `GET /stock/movements`

---

## Остатки в реальном времени

### Резервирование при продаже

```typescript
// При создании заказа
shopProduct.stockQuantity = 100
shopProduct.reservedQuantity = 5  // Зарезервировано под заказы

// Доступно для продажи
availableQuantity = stockQuantity - reservedQuantity  // 95
```

### Уведомления о низких остатках

```typescript
{
  product: productId,
  location: shopId,
  currentStock: 5,
  minStock: 10,  // Минимальный остаток
  alertLevel: "CRITICAL",  // CRITICAL | WARNING | INFO
  message: "Товар заканчивается, требуется пополнение"
}
```

**Правила:**
- `< minStock * 0.5` → CRITICAL (красный)
- `< minStock` → WARNING (жёлтый)  
- `< minStock * 1.5` → INFO (синий)

---

## Техническая сводка

### Модули

- `inventory/warehouse` - склады
- `inventory/stock-movement` - движение товара
- `inventory/transfer` - перемещения
- `inventory/write-off` - списания
- `inventory/inventory-audit` - инвентаризации
- `import/import-service` - импорт данных

### API

**Shop/Warehouse:**
- `GET /shop/stock` - остатки магазина
- `GET /warehouse/stock` - остатки склада
- `POST /shop/receiving` - приёмка
- `POST /shop/transfer-requests` - запрос товара
- `POST /shop/write-offs` - списание
- `POST /shop/inventory` - инвентаризация

**Import:**
- `POST /import/upload` - загрузка файла
- `GET /import/templates` - шаблоны
- `POST /import/process` - импорт

**Reports:**
- `GET /reports/stock-balance` - остатки
- `GET /reports/movements` - движение
- `GET /reports/turnover` - оборачиваемость

### Бизнес-правила

1. **Остатки не могут быть отрицательными**
2. **Резерв создаётся** при оплате заказа
3. **Резерв снимается** при отгрузке или отмене
4. **Списание >1000₽** требует фото
5. **Расхождения >5%** требуют одобрения
6. **Перемещения** проводятся через документы
7. **История** хранится минимум 3 года
8. **Импорт** не удаляет существующие товары

---

## Интеграция с внешними системами

### Webhooks для синхронизации

```typescript
// Отправка изменений во внешнюю систему
POST https://external.system/webhook
{
  event: "STOCK_UPDATED",
  product: { sku: "12345", name: "Яблоко" },
  location: { id: "shop_1", name: "Магазин на Ленина" },
  oldQuantity: 100,
  newQuantity: 95,
  timestamp: "2024-11-23T10:00:00Z"
}
```

### API для внешних систем

```typescript
// Получение остатков
GET /api/external/stock?sku=12345
Authorization: Bearer {api_token}

// Обновление остатков
PATCH /api/external/stock
{
  sku: "12345",
  location: "shop_1",
  quantity: 95
}
```

---

## Примеры

### Типичный день магазина

```typescript
// Утро - приёмка товара
receiving = createReceiving({
  supplier: "Овощебаза",
  items: [
    { product: "Яблоки", planned: 100, actual: 98 },
    { product: "Бананы", planned: 50, actual: 50 }
  ]
})

// День - продажи (автоматически при заказах)
// stockQuantity уменьшается при подтверждении заказа

// Вечер - списание просрочки
writeOff = createWriteOff({
  reason: "EXPIRED",
  items: [
    { product: "Молоко", quantity: 3 }
  ]
})

// Конец недели - инвентаризация выборочная
inventory = startInventory({
  type: "SELECTIVE",
  categories: ["Молочные продукты"]
})
```

---

## Связь с другими процессами

**Order Flow:**
- Оплата заказа → резервирование товара
- Выдача заказа → списание остатков

**Finance Flow:**
- Списания → учёт в расходах
- Недостачи → возможные штрафы

**Product/ShopProduct:**
- Создание товара → начальные остатки
- Обновление цен → не влияет на остатки

---

> **Статус:** ✅ Готов  
> **Обновлено:** 2024-11-24