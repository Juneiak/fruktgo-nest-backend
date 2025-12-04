# Процесс: Складской учёт

> **Статус:** ✅ Полностью реализовано (Фазы 1-4)  
> **Обновлено:** 2024-12-03

---

## Как это работает

### Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│                         SELLER (владелец)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   СКЛАДЫ (Warehouse)              МАГАЗИНЫ (Shop)               │
│   ┌──────────────┐                ┌──────────────┐              │
│   │ Warehouse 1  │ ──Transfer───▶ │    Shop 1    │              │
│   │  - products  │                │ - shopProducts│──▶ Продажи  │
│   │  - остатки   │                │ - остатки    │              │
│   └──────────────┘                └──────────────┘              │
│          │                               ▲                      │
│          │                               │                      │
│   ┌──────────────┐                ┌──────────────┐              │
│   │ Warehouse 2  │ ──Transfer───▶ │    Shop 2    │              │
│   └──────────────┘                └──────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         ▲                                    │
         │                                    ▼
    ┌─────────┐                        ┌─────────────┐
    │ Приёмка │                        │  Списание   │
    │ от пос- │                        │ (брак,      │
    │ тавщика │                        │  просрочка) │
    └─────────┘                        └─────────────┘
```

### Ключевые сущности

| Сущность | Где | Что хранит |
|----------|-----|------------|
| **Warehouse** | `src/modules/warehouse/` | Склад продавца (адрес, контакты) |
| **WarehouseProduct** | `src/modules/warehouse-product/` | Остаток товара НА СКЛАДЕ |
| **Shop** | `src/modules/shop/` | Магазин продавца |
| **ShopProduct** | `src/modules/shop-product/` | Остаток товара В МАГАЗИНЕ + продажи |

### Операции и их модули

| Операция | Модуль | Что делает |
|----------|--------|------------|
| **Приёмка** | `receiving` | Товар пришёл → +остаток |
| **Списание** | `write-off` | Брак/просрочка → -остаток |
| **Перемещение** | `transfer` | Склад→Магазин или Магазин→Магазин |
| **Инвентаризация** | `inventory-audit` | Сверка факта с учётом |
| **Импорт** | `import` | Загрузка данных из Excel/1С |

### История движений

**Каждое изменение остатка** записывается в `StockMovement`:
- Кто изменил (employeeId)
- Когда (timestamp)
- Сколько (+/-)
- Почему (тип операции, документ)
- Остаток до/после

---

## Workflow операций

### 1. Приёмка (Receiving)

```
DRAFT → CONFIRMED
```

1. **Создаём черновик** с ожидаемым количеством
2. **Подтверждаем** с фактическим количеством
3. Автоматически: +остаток, запись в StockMovement

**Типы приёмки:**
- `SUPPLIER` - от поставщика
- `TRANSFER` - с другой точки
- `RETURN` - возврат от покупателя
- `INITIAL` - начальные остатки

### 2. Списание (WriteOff)

```
DRAFT → CONFIRMED
```

1. **Создаём черновик** с причиной и позициями
2. **Подтверждаем**
3. Автоматически: -остаток, запись в StockMovement

**Причины списания:**
- `EXPIRED` - просрочка
- `DAMAGED` - брак
- `SHORTAGE` - недостача
- `SPOILAGE` - порча
- `THEFT` - кража
- `TESTING` - дегустация
- `OTHER` - другое

### 3. Перемещение (Transfer)

```
DRAFT → SENT → RECEIVED
```

1. **Создаём черновик** (откуда, куда, что)
2. **Отправляем** → -остаток у отправителя
3. **Принимаем** → +остаток у получателя

**Направления:**
- Shop → Shop
- Warehouse → Shop
- Warehouse → Warehouse
- Shop → Warehouse

### 4. Инвентаризация (InventoryAudit)

```
DRAFT → IN_PROGRESS → COMPLETED
```

1. **Создаём** → формируем список товаров для проверки
2. **Начинаем** → сотрудники вносят фактические количества
3. **Завершаем** → (опционально) применяем расхождения к остаткам

**Типы:**
- `FULL` - полная (все товары)
- `PARTIAL` - выборочная
- `CONTROL` - контрольная проверка

### 5. Резервирование при заказе

```
Заказ создан → товар зарезервирован
Заказ отменён → резерв снят
Заказ доставлен → товар списан
```

Поля ShopProduct:
- `stockQuantity` - общий остаток
- `reservedQuantity` - зарезервировано под заказы
- `availableQuantity` = stockQuantity - reservedQuantity

---

## API Endpoints

### Employee (работа с магазином)

**Списание:**
```
GET    /shop/inventory/write-offs              
POST   /shop/inventory/write-offs              
POST   /shop/inventory/write-offs/:id/confirm  
```

**Приёмка:**
```
GET    /shop/inventory/receivings              
POST   /shop/inventory/receivings              
POST   /shop/inventory/receivings/:id/confirm  
```

**Перемещения:**
```
GET    /shop/inventory/transfers/outgoing      
GET    /shop/inventory/transfers/incoming      
POST   /shop/inventory/transfers               
POST   /shop/inventory/transfers/:id/send      
POST   /shop/inventory/transfers/:id/receive   
```

**Инвентаризация:**
```
GET    /shop/inventory/audits                  
POST   /shop/inventory/audits                  
POST   /shop/inventory/audits/:id/start        
PATCH  /shop/inventory/audits/:id/items        
POST   /shop/inventory/audits/:id/complete     
```

### Seller (управление складами)

**Склады:**
```
GET    /seller/warehouses              
POST   /seller/warehouses              
PATCH  /seller/warehouses/:id          
PATCH  /seller/warehouses/:id/status   
```

**Товары на складе:**
```
GET    /seller/warehouses/:id/products              
POST   /seller/warehouses/:id/products              
PATCH  /seller/warehouses/:id/products/:id/adjust   
PATCH  /seller/warehouses/:id/products/:id/set-stock
GET    /seller/warehouses/:id/products/low-stock    
```

---

## Справочник для разработчика

### Модули

| Модуль | Путь | Port Symbol |
|--------|------|-------------|
| StockMovement | `src/modules/stock-movement/` | `STOCK_MOVEMENT_PORT` |
| WriteOff | `src/modules/write-off/` | `WRITE_OFF_PORT` |
| Receiving | `src/modules/receiving/` | `RECEIVING_PORT` |
| Transfer | `src/modules/transfer/` | `TRANSFER_PORT` |
| InventoryAudit | `src/modules/inventory-audit/` | `INVENTORY_AUDIT_PORT` |
| Warehouse | `src/modules/warehouse/` | `WAREHOUSE_PORT` |
| WarehouseProduct | `src/modules/warehouse-product/` | `WAREHOUSE_PRODUCT_PORT` |
| Import | `src/infra/import/` | `IMPORT_SERVICE` |

### Оркестратор

```typescript
import { 
  INVENTORY_PROCESS_ORCHESTRATOR, 
  InventoryProcessOrchestrator 
} from 'src/processes/inventory';

// Инъекция
@Inject(INVENTORY_PROCESS_ORCHESTRATOR) 
private readonly inventoryProcess: InventoryProcessOrchestrator

// Использование
await inventoryProcess.createWriteOff({ shopId, reason, items, employeeId, employeeName });
await inventoryProcess.confirmWriteOff({ writeOffId, employeeId, employeeName });

await inventoryProcess.createReceiving({ shopId, type, items, employeeId, employeeName });
await inventoryProcess.confirmReceiving({ receivingId, actualItems, employeeId, employeeName });

await inventoryProcess.createTransfer({ sourceShopId, targetShopId, items, employeeId, employeeName });
await inventoryProcess.sendTransfer({ transferId, employeeId, employeeName });
await inventoryProcess.receiveTransfer({ transferId, employeeId, employeeName });

await inventoryProcess.createInventoryAudit({ shopId, type, shopProductIds, employeeId });
await inventoryProcess.completeInventoryAudit({ inventoryAuditId, applyResults, employeeId, employeeName });
```

### Структура модуля (типовая)

```
src/modules/{module-name}/
├── index.ts              # Barrel exports
├── {name}.enums.ts       # Перечисления (Status, Type, Reason)
├── {name}.schema.ts      # MongoDB схема
├── {name}.commands.ts    # Create, Update, Confirm, Cancel
├── {name}.queries.ts     # Get, GetList, GetBy...
├── {name}.port.ts        # Интерфейс порта + Symbol
├── {name}.service.ts     # Реализация
└── {name}.module.ts      # NestJS модуль
```

### Типы документов StockMovement

| Тип | Когда создаётся |
|-----|-----------------|
| `RESERVATION` | При создании заказа |
| `RESERVATION_CANCEL` | При отмене заказа |
| `ADJUSTMENT` | При корректировке (недовес при сборке) |
| `SALE` | При продаже |
| `RECEIVING` | При подтверждении приёмки |
| `WRITE_OFF` | При подтверждении списания |
| `TRANSFER` | При перемещении |

---

## Бизнес-правила

1. **Остатки не могут быть отрицательными**
2. **Резерв создаётся** при создании заказа
3. **Резерв снимается** при отмене или доставке
4. **Все изменения остатков** записываются в StockMovement
5. **Документы проводятся** транзакционно (MongoDB sessions)
6. **История хранится** для аудита

---

## Партионный учёт (Lot/Batch Tracking)

Для скоропортящихся товаров реализован партионный учёт с FIFO.

### Модули

| Модуль | Путь | Назначение |
|--------|------|------------|
| **ProductBatch** | `src/modules/product-batch/` | Партия товара (срок годности, поставщик) |
| **BatchStock** | `src/modules/batch-stock/` | Остаток партии в конкретной локации |

### ProductBatch — партия товара

```typescript
{
  seller: ObjectId,        // Владелец
  product: ObjectId,       // Товар
  batchNumber: string,     // Номер партии
  expirationDate: Date,    // Срок годности (!)
  productionDate?: Date,   // Дата производства
  supplier?: string,       // Поставщик
  supplierInvoice?: string,// Номер накладной
  purchasePrice?: number,  // Закупочная цена
  initialQuantity: number, // Начальное кол-во
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'DEPLETED',
}
```

### BatchStock — остаток партии в локации

```typescript
{
  batch: ObjectId,         // Партия
  locationType: 'SHOP' | 'WAREHOUSE',
  shop?: ObjectId,         // Если в магазине
  warehouse?: ObjectId,    // Если на складе
  shopProduct?: ObjectId,  // Связь с ShopProduct
  warehouseProduct?: ObjectId,
  quantity: number,        // Текущий остаток
  reservedQuantity: number,// Зарезервировано
  status: 'ACTIVE' | 'BLOCKED' | 'DEPLETED',
}
```

### FIFO логика

При продаже/списании автоматически выбираются партии с ближайшим сроком годности:

```typescript
// Списать 10 единиц по FIFO
const result = await batchStockPort.consumeFifo(
  new BatchStockCommands.ConsumeFifoCommand({
    locationType: BatchStockLocationType.SHOP,
    shopProductId: '...',
    productId: '...',
    quantity: 10,
  })
);

// result.consumed — какие партии списались
// result.remainingToConsume — сколько не хватило (0 если всё ок)
```

### Уровни алертов по сроку годности

| Уровень | Условие | Действие |
|---------|---------|----------|
| `NORMAL` | > 7 дней | Нормально |
| `WARNING` | 3-7 дней | Уведомление менеджеру |
| `CRITICAL` | < 3 дней | Срочная распродажа / списание |
| `EXPIRED` | Истёк | Автоблокировка, списание |

### Workflow

1. **Приёмка** → создаётся `ProductBatch` + `BatchStock` в локации
2. **Продажа** → `consumeFifo()` списывает по FIFO
3. **Списание** → можно списать конкретную партию или по FIFO
4. **Перемещение** → `transferBatchStock()` между локациями
5. **Cron job** → `expireProductBatches()` помечает истёкшие

### Использование

```typescript
import { 
  ProductBatchPort, PRODUCT_BATCH_PORT, 
  ProductBatchCommands, ProductBatchQueries 
} from 'src/modules/product-batch';

import { 
  BatchStockPort, BATCH_STOCK_PORT, 
  BatchStockCommands, BatchStockQueries 
} from 'src/modules/batch-stock';
```

---

## Импорт данных

### Поддерживаемые форматы
- Excel (.xlsx)
- CSV (.csv)
- CommerceML 2.0 (1С) - структура готова

### Типы импорта
- `PRODUCTS` - товары
- `WAREHOUSE_STOCK` - остатки на складе
- `SHOP_STOCK` - остатки в магазине
- `PRICES` - цены

### Workflow
1. Загрузка файла → создание ImportJob
2. Парсинг и валидация
3. Создание/обновление записей
4. Отчёт: created/updated/errors
