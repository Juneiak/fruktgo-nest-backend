# План рефакторинга складского учёта

> **Цель:** Привести текущую реализацию в соответствие с архитектурой из `inventory-system-explained-v2.md`  
> **Создано:** 2024-12-04

---

## 1. Обзор проблемы

Текущая реализация складского учёта создавалась итеративно и содержит ряд несоответствий целевой архитектуре. Ключевая проблема: **партионный учёт (ProductBatch/BatchStock) существует как отдельный слой, но НЕ интегрирован в основные бизнес-процессы**.

---

## 2. Детальный анализ несоответствий

### 2.1. Модуль Product (шаблон товара)

**Текущее состояние:**
```typescript
// src/modules/product/product.schema.ts
class Product {
  productName: string;
  category: ProductCategory;          // FRUITS, VEGETABLES, BERRIES...
  price: number;
  measuringScale: ProductMeasuringScale; // KG, PC
  // ...статистика, изображение
}
```

**Отсутствует (по v2):**
- ❌ Условия хранения (идеальная температура, влажность)
- ❌ Базовый срок годности при идеальных условиях
- ❌ Пресет коэффициентов порчи (BERRIES, CITRUS, LEAFY_GREENS и т.д.)
- ❌ Чувствительность к условиям (HIGH, MEDIUM, LOW)
- ❌ Ограничения на возврат по категориям

**Влияние:** Невозможно рассчитать динамический срок годности при перемещении товара между локациями с разными условиями хранения.

---

### 2.2. Модуль Warehouse (склад)

**Текущее состояние:**
```typescript
// src/modules/warehouse/warehouse.schema.ts
class Warehouse {
  seller: ObjectId;
  name: string;
  address?: ObjectId;
  contact?: WarehouseContact;
  status: WarehouseStatus;
}
```

**Отсутствует (по v2):**
- ❌ Условия хранения (температура, влажность)
- ❌ Тип хранения (COLD_STORAGE, DRY, ROOM_TEMP)
- ❌ Коэффициент порчи локации

**То же для Shop** — нет информации об условиях хранения в торговом зале.

---

### 2.3. Модуль ProductBatch (партия товара)

**Текущее состояние:**
```typescript
// src/modules/product-batch/product-batch.schema.ts
class ProductBatch {
  seller: ObjectId;
  product: ObjectId;
  batchNumber: string;
  productionDate?: Date;
  expirationDate: Date;              // Статический срок от поставщика
  supplier?: string;
  purchasePrice?: number;
  initialQuantity: number;
  status: ProductBatchStatus;        // ACTIVE, BLOCKED, EXPIRED, DEPLETED
  // Virtuals: daysUntilExpiration, expirationAlertLevel
}
```

**Отсутствует (по v2):**
- ❌ `effectiveExpirationDate` — пересчитанный срок с учётом условий хранения
- ❌ `freshnessReserve` — запас свежести в условных днях
- ❌ История локаций с датами и коэффициентами
- ❌ Логика пересчёта срока при перемещении

**Проблема:** Срок годности статичен и не учитывает, где товар хранился (холодильник vs торговый зал).

---

### 2.4. Модуль BatchStock (остаток партии в локации)

**Текущее состояние:**
```typescript
// src/modules/batch-stock/batch-stock.schema.ts
class BatchStock {
  batch: ObjectId;                   // Ссылка на ProductBatch
  locationType: 'SHOP' | 'WAREHOUSE';
  shop?: ObjectId;
  warehouse?: ObjectId;
  shopProduct?: ObjectId;            // Связь для быстрого поиска
  warehouseProduct?: ObjectId;
  quantity: number;
  reservedQuantity: number;
  status: BatchStockStatus;
}
```

**Отсутствует (по v2):**
- ❌ `arrivedAt` — дата прибытия в локацию (для расчёта потраченной свежести)
- ❌ Связь с условиями хранения локации

---

### 2.5. Модуль Receiving (приёмка) — КРИТИЧНО

**Текущее состояние:**
```typescript
// src/modules/receiving/receiving.schema.ts
class ReceivingItem {
  shopProduct: ObjectId;             // ← Ссылка на ShopProduct, НЕ на партию!
  expectedQuantity: number;
  actualQuantity?: number;
}

class Receiving {
  shop: ObjectId;                    // ← Только магазин, нет складов
  items: ReceivingItem[];
  // ...
}
```

**Критические проблемы:**
1. ❌ Приёмка работает с `ShopProduct`, а НЕ создаёт `ProductBatch`
2. ❌ Нет ввода срока годности при приёмке
3. ❌ Нет поддержки приёмки на склад (только Shop)
4. ❌ Не создаётся `BatchStock` при подтверждении приёмки

**Это ключевая точка отказа**: партионный учёт не работает, потому что партии не создаются при приёмке.

---

### 2.6. Модуль Transfer (перемещение)

**Текущее состояние:**
```typescript
// src/modules/transfer/transfer.schema.ts
class TransferItem {
  shopProduct?: ObjectId;
  warehouseProduct?: ObjectId;
  product: ObjectId;
  quantity: number;
}
```

**Проблемы:**
- ❌ Перемещает товары без учёта партий
- ❌ Не выбирает партии по FEFO
- ❌ Не пересчитывает сроки годности при смене локации
- ❌ Не переносит `BatchStock` между локациями

---

### 2.7. Модуль StockMovement (история движений)

**Текущее состояние:**
```typescript
// src/modules/stock-movement/stock-movement.schema.ts
class StockMovement {
  type: StockMovementType;
  shopProduct: ObjectId;             // ← Только ShopProduct
  shop: ObjectId;                    // ← Только Shop
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  // ...
}
```

**Проблемы:**
- ❌ Не поддерживает Warehouse
- ❌ Не связан с партиями (`ProductBatch`)
- ❌ Не хранит, из какой партии было списание

---

### 2.8. Модуль Return (возвраты) — ОТСУТСТВУЕТ

**Текущее состояние:** Модуль не существует.

**Требуется по v2:**
- Возврат от клиента (CUSTOMER_RETURN)
- Возврат от курьера (DELIVERY_RETURN)
- Возврат поставщику (SUPPLIER_RETURN)
- Оценка состояния товара
- Пересчёт срока годности с учётом времени вне контроля
- Матрица решений (полка / скидка / списание)
- Ограничения по категориям (ягоды не принимаем)

---

### 2.9. Офлайн-продажи — ОТСУТСТВУЕТ

**Текущее состояние:** Нет поддержки.

**Требуется по v2:**
- Механизм продажи без создания Order
- Предупреждение о конфликте с резервами онлайн-заказов
- Возможность "залезть" в резерв с подтверждением

---

### 2.10. ShopProduct и WarehouseProduct — ДУБЛИРОВАНИЕ

**Текущее состояние:**
- `ShopProduct.stockQuantity` / `reservedQuantity`
- `WarehouseProduct.stockQuantity` / `reservedQuantity`
- `BatchStock.quantity` / `reservedQuantity`

**Проблема:** Три источника правды об остатках. При партионном учёте остаток должен считаться как сумма `BatchStock.quantity`, а не храниться в `ShopProduct`.

---

## 3. Сводная таблица несоответствий

| Модуль | Статус | Критичность | Описание |
|--------|--------|-------------|----------|
| Product | ⚠️ Частично | ВЫСОКАЯ | Нет условий хранения, пресетов коэффициентов |
| Warehouse | ⚠️ Частично | СРЕДНЯЯ | Нет условий хранения |
| Shop | ⚠️ Частично | СРЕДНЯЯ | Нет условий хранения |
| ProductBatch | ⚠️ Частично | ВЫСОКАЯ | Нет динамического срока, нет freshnessReserve |
| BatchStock | ⚠️ Частично | СРЕДНЯЯ | Нет arrivedAt |
| Receiving | ❌ Не соответствует | КРИТИЧЕСКАЯ | Не создаёт партии! |
| Transfer | ❌ Не соответствует | ВЫСОКАЯ | Не работает с партиями |
| StockMovement | ⚠️ Частично | СРЕДНЯЯ | Нет Warehouse, нет связи с партиями |
| Return | ❌ Отсутствует | ВЫСОКАЯ | Нет модуля |
| Offline Sales | ❌ Отсутствует | СРЕДНЯЯ | Нет механизма |

---

## 4. План рефакторинга

### Фаза 0: Подготовка (оценка: 2 дня)

1. **Создать feature branch** `feature/inventory-v2`
2. **Написать миграционные скрипты** для существующих данных
3. **Определить переходный период** — как работать пока рефакторинг не завершён

---

### Фаза 1: Расширение схем (оценка: 3-4 дня)

#### 1.1. Product — условия хранения

```typescript
// Добавить в product.schema.ts

@Schema({ _id: false })
export class StorageConditions {
  @Prop({ type: Number })
  idealTempMin?: number;         // Идеальная температура мин (°C)

  @Prop({ type: Number })
  idealTempMax?: number;         // Идеальная температура макс (°C)

  @Prop({ type: Number })
  idealHumidityMin?: number;     // Идеальная влажность мин (%)

  @Prop({ type: Number })
  idealHumidityMax?: number;     // Идеальная влажность макс (%)
}

@Schema({ _id: false })
export class ShelfLifeConfig {
  @Prop({ type: Number, required: true })
  baseDays: number;              // Базовый срок при идеальных условиях

  @Prop({ type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' })
  sensitivity: string;           // Чувствительность к условиям
}

// Пресеты коэффициентов
export enum StoragePreset {
  BERRIES = 'BERRIES',
  STONE_FRUITS = 'STONE_FRUITS',
  CITRUS = 'CITRUS',
  APPLES_PEARS = 'APPLES_PEARS',
  TROPICAL = 'TROPICAL',
  LEAFY_GREENS = 'LEAFY_GREENS',
  ROOT_VEGETABLES = 'ROOT_VEGETABLES',
  TOMATOES = 'TOMATOES',
  CUCUMBERS = 'CUCUMBERS',
  MUSHROOMS = 'MUSHROOMS',
}

// В Product добавить:
@Prop({ type: StorageConditionsSchema })
storageConditions?: StorageConditions;

@Prop({ type: ShelfLifeConfigSchema })
shelfLife?: ShelfLifeConfig;

@Prop({ type: String, enum: Object.values(StoragePreset) })
storagePreset?: StoragePreset;

@Prop({ type: Boolean, default: true })
acceptReturns: boolean;          // Можно ли принимать возвраты
```

#### 1.2. Warehouse/Shop — условия хранения

```typescript
// В warehouse.schema.ts и shop.schema.ts добавить:

export enum StorageZoneType {
  COLD = 'COLD',                 // Холодильник (0-4°C)
  COOL = 'COOL',                 // Прохлада (10-15°C)
  ROOM = 'ROOM',                 // Комната (18-22°C)
  WARM = 'WARM',                 // Тепло (>25°C)
}

@Schema({ _id: false })
export class StorageZone {
  @Prop({ type: String, required: true })
  name: string;                  // "Холодильник", "Торговый зал"

  @Prop({ type: String, enum: Object.values(StorageZoneType), required: true })
  type: StorageZoneType;

  @Prop({ type: Number })
  avgTemperature?: number;

  @Prop({ type: Number })
  avgHumidity?: number;
}

// В Warehouse/Shop:
@Prop({ type: [StorageZoneSchema], default: [] })
storageZones: StorageZone[];

@Prop({ type: String, enum: Object.values(StorageZoneType), default: StorageZoneType.ROOM })
defaultStorageType: StorageZoneType;
```

#### 1.3. ProductBatch — динамический срок

```typescript
// Расширить product-batch.schema.ts

@Schema({ _id: false })
export class BatchLocationHistory {
  @Prop({ type: Types.ObjectId, required: true })
  locationId: Types.ObjectId;     // Shop или Warehouse

  @Prop({ type: String, enum: ['SHOP', 'WAREHOUSE'], required: true })
  locationType: string;

  @Prop({ type: String, enum: Object.values(StorageZoneType), required: true })
  storageType: StorageZoneType;

  @Prop({ type: Number, required: true })
  coefficient: number;            // Коэффициент порчи

  @Prop({ type: Date, required: true })
  arrivedAt: Date;

  @Prop({ type: Date })
  leftAt?: Date;

  @Prop({ type: Number })
  freshnessSpent?: number;        // Потрачено свежести за период
}

// Добавить в ProductBatch:
@Prop({ type: Number, required: true })
freshnessReserve: number;         // Запас свежести в условных днях

@Prop({ type: Date, required: true })
effectiveExpirationDate: Date;    // Пересчитанный срок

@Prop({ type: [BatchLocationHistorySchema], default: [] })
locationHistory: BatchLocationHistory[];

@Prop({ type: Date })
lastRecalculatedAt?: Date;        // Когда последний раз пересчитывали
```

#### 1.4. BatchStock — дата прибытия

```typescript
// Добавить в batch-stock.schema.ts

@Prop({ type: Date, required: true, default: () => new Date() })
arrivedAt: Date;                  // Когда партия прибыла в эту локацию

@Prop({ type: String, enum: Object.values(StorageZoneType) })
storageType?: StorageZoneType;    // В какой зоне хранится
```

---

### Фаза 2: Сервис расчёта сроков (оценка: 2-3 дня)

Создать **ShelfLifeCalculator** — сервис для расчёта динамических сроков.

```typescript
// src/modules/product-batch/shelf-life-calculator.service.ts

@Injectable()
export class ShelfLifeCalculatorService {
  
  /**
   * Получить коэффициент порчи для продукта в заданных условиях
   */
  getDecayCoefficient(
    preset: StoragePreset,
    storageType: StorageZoneType,
    humidity?: number,
  ): number;

  /**
   * Рассчитать потраченную свежесть за период
   */
  calculateFreshnessSpent(
    coefficient: number,
    hoursInLocation: number,
  ): number;

  /**
   * Пересчитать effectiveExpirationDate при перемещении
   */
  recalculateExpiration(
    batch: ProductBatch,
    newStorageType: StorageZoneType,
    product: Product,
  ): { 
    newFreshnessReserve: number; 
    newEffectiveExpiration: Date;
  };

  /**
   * Проверить критические комбинации условий
   */
  checkCriticalConditions(
    preset: StoragePreset,
    storageType: StorageZoneType,
    humidity?: number,
  ): { isCritical: boolean; multiplier: number };
}
```

**Таблицы коэффициентов** — вынести в константы или конфиг:

```typescript
// src/modules/product-batch/decay-coefficients.ts

export const TEMP_COEFFICIENTS: Record<StoragePreset, Record<StorageZoneType, number>> = {
  [StoragePreset.BERRIES]: {
    [StorageZoneType.COLD]: 0.4,
    [StorageZoneType.COOL]: 0.8,
    [StorageZoneType.ROOM]: 1.5,
    [StorageZoneType.WARM]: 3.0,
  },
  // ... остальные пресеты
};

export const HUMIDITY_MODIFIERS: Record<StoragePreset, Record<string, number>> = {
  [StoragePreset.BERRIES]: {
    DRY: 1.8,
    NORMAL: 1.3,
    HUMID: 1.0,
    VERY_HUMID: 0.9,
  },
  // ...
};

export const CRITICAL_COMBINATIONS: Array<{
  preset: StoragePreset;
  conditions: { temp: StorageZoneType; humidity: string };
  multiplier: number;
}> = [
  { preset: StoragePreset.BERRIES, conditions: { temp: StorageZoneType.WARM, humidity: 'DRY' }, multiplier: 8.0 },
  // ...
];
```

---

### Фаза 3: Переработка Receiving (оценка: 3-4 дня)

Это **критическая фаза** — приёмка должна создавать партии.

#### 3.1. Новая схема ReceivingItem

```typescript
@Schema({ _id: false })
export class ReceivingItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;            // Ссылка на Product, не ShopProduct!

  @Prop({ type: Number, required: true, min: 0 })
  expectedQuantity: number;

  @Prop({ type: Number, min: 0 })
  actualQuantity?: number;

  // --- Данные для создания партии ---
  @Prop({ type: Date })
  expirationDate?: Date;              // Срок годности от поставщика

  @Prop({ type: Date })
  productionDate?: Date;

  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  @Prop({ type: String })
  batchNumber?: string;               // Номер партии (если известен)

  @Prop({ type: String })
  comment?: string;

  // --- После подтверждения ---
  @Prop({ type: Types.ObjectId, ref: ProductBatch.name })
  createdBatch?: Types.ObjectId;      // Созданная партия
}
```

#### 3.2. Receiving поддержка Warehouse

```typescript
@Schema()
export class Receiving {
  // Добавить
  @Prop({ type: String, enum: ['SHOP', 'WAREHOUSE'], required: true })
  locationType: string;

  @Prop({ type: Types.ObjectId, ref: Shop.name })
  shop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Warehouse.name })
  warehouse?: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(StorageZoneType) })
  storageZone?: StorageZoneType;      // В какую зону принимаем
}
```

#### 3.3. Логика confirmReceiving

```typescript
async confirmReceiving(command: ConfirmReceivingCommand): Promise<Receiving> {
  // 1. Для каждой позиции создать ProductBatch
  for (const item of receiving.items) {
    const batch = await this.productBatchPort.createProductBatch(
      new ProductBatchCommands.CreateProductBatchCommand({
        sellerId: receiving.seller,
        productId: item.product,
        batchNumber: item.batchNumber || this.generateBatchNumber(),
        expirationDate: item.expirationDate,
        productionDate: item.productionDate,
        freshnessReserve: this.calculateInitialFreshness(item, product),
        effectiveExpirationDate: item.expirationDate,
        initialQuantity: item.actualQuantity,
        supplier: receiving.supplier,
        purchasePrice: item.purchasePrice,
      })
    );

    // 2. Создать BatchStock в локации
    await this.batchStockPort.createBatchStock(
      new BatchStockCommands.CreateBatchStockCommand({
        batchId: batch._id,
        locationType: receiving.locationType,
        shopId: receiving.shop,
        warehouseId: receiving.warehouse,
        quantity: item.actualQuantity,
        storageType: receiving.storageZone,
      })
    );

    // 3. Обновить агрегированный остаток в ShopProduct/WarehouseProduct
    await this.updateAggregatedStock(receiving.locationType, item);

    // 4. Записать в историю партии
    await this.productBatchPort.addLocationHistory(...);
  }

  // 5. Записать StockMovement
  await this.stockMovementPort.createMovements(...);
}
```

---

### Фаза 4: Переработка Transfer (оценка: 2-3 дня)

#### 4.1. Transfer должен работать с партиями

```typescript
@Schema({ _id: false })
export class TransferItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Number, min: 0.001, required: true })
  quantity: number;

  // --- Партии для перемещения (заполняется при SENT) ---
  @Prop({ type: [{ 
    batchId: Types.ObjectId, 
    batchStockId: Types.ObjectId,
    quantity: Number 
  }], default: [] })
  batches: Array<{
    batchId: Types.ObjectId;
    batchStockId: Types.ObjectId;
    quantity: number;
  }>;
}
```

#### 4.2. Логика sendTransfer

```typescript
async sendTransfer(command: SendTransferCommand): Promise<Transfer> {
  for (const item of transfer.items) {
    // 1. Выбрать партии по FEFO
    const batchesToTransfer = await this.batchStockPort.selectBatchesFEFO(
      new BatchStockQueries.SelectBatchesFEFOQuery({
        locationType: transfer.sourceType,
        locationId: transfer.sourceShop || transfer.sourceWarehouse,
        productId: item.product,
        quantity: item.quantity,
      })
    );

    // 2. Уменьшить остаток в источнике
    for (const batch of batchesToTransfer) {
      await this.batchStockPort.decreaseQuantity({
        batchStockId: batch.batchStockId,
        quantity: batch.quantity,
      });
    }

    // 3. Сохранить информацию о партиях в TransferItem
    item.batches = batchesToTransfer;
  }
}
```

#### 4.3. Логика receiveTransfer

```typescript
async receiveTransfer(command: ReceiveTransferCommand): Promise<Transfer> {
  for (const item of transfer.items) {
    for (const batchInfo of item.batches) {
      // 1. Создать или обновить BatchStock в новой локации
      const existingBatchStock = await this.batchStockPort.findByBatchAndLocation(...);

      if (existingBatchStock) {
        await this.batchStockPort.increaseQuantity(...);
      } else {
        await this.batchStockPort.createBatchStock({
          batchId: batchInfo.batchId,
          locationType: transfer.targetType,
          locationId: transfer.targetShop || transfer.targetWarehouse,
          quantity: batchInfo.quantity,
          arrivedAt: new Date(),
        });
      }

      // 2. Пересчитать срок годности партии
      const batch = await this.productBatchPort.getBatch(batchInfo.batchId);
      const newExpiration = this.shelfLifeCalculator.recalculateExpiration(
        batch,
        targetStorageType,
        product,
      );
      await this.productBatchPort.updateExpiration(batchInfo.batchId, newExpiration);

      // 3. Добавить запись в историю локаций партии
      await this.productBatchPort.addLocationHistory(batchInfo.batchId, {
        locationId: transfer.targetShop || transfer.targetWarehouse,
        locationType: transfer.targetType,
        storageType: targetStorageType,
        arrivedAt: new Date(),
        coefficient: newExpiration.coefficient,
      });
    }
  }

  // 4. Обновить агрегированные остатки
  await this.updateAggregatedStocks(...);
}
```

---

### Фаза 5: Модуль Return (оценка: 3-4 дня)

Создать новый модуль `src/modules/return/`.

#### 5.1. Схема Return

```typescript
export enum ReturnType {
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',
  DELIVERY_RETURN = 'DELIVERY_RETURN',
  SUPPLIER_RETURN = 'SUPPLIER_RETURN',
}

export enum ReturnStatus {
  PENDING_INSPECTION = 'PENDING_INSPECTION',
  INSPECTED = 'INSPECTED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum ReturnDecision {
  RETURN_TO_SHELF = 'RETURN_TO_SHELF',
  RETURN_WITH_DISCOUNT = 'RETURN_WITH_DISCOUNT',
  WRITE_OFF = 'WRITE_OFF',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
}

export enum ProductCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  SATISFACTORY = 'SATISFACTORY',
  UNSATISFACTORY = 'UNSATISFACTORY',
}

@Schema({ _id: false })
export class ReturnItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: ProductBatch.name })
  originalBatch?: Types.ObjectId;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, enum: Object.values(ProductCondition) })
  condition?: ProductCondition;

  @Prop({ type: String, enum: Object.values(ReturnDecision) })
  decision?: ReturnDecision;

  @Prop({ type: Number, min: 0, max: 100 })
  discountPercent?: number;

  @Prop({ type: Number })
  remainingFreshness?: number;

  @Prop({ type: String })
  inspectionNotes?: string;
}

@Schema()
export class Return {
  @Prop({ type: String, enum: Object.values(ReturnType), required: true })
  type: ReturnType;

  @Prop({ type: String, enum: Object.values(ReturnStatus), default: ReturnStatus.PENDING_INSPECTION })
  status: ReturnStatus;

  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
  shop: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Order.name })
  order?: Types.ObjectId;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: Number })
  timeOutOfControl?: number;          // Минут вне контролируемых условий

  @Prop({ type: [ReturnItemSchema], required: true })
  items: ReturnItem[];

  @Prop({ type: Types.ObjectId, ref: Employee.name })
  inspectedBy?: Types.ObjectId;

  @Prop({ type: Date })
  inspectedAt?: Date;
}
```

#### 5.2. ReturnDecisionService

```typescript
@Injectable()
export class ReturnDecisionService {
  /**
   * Рекомендовать решение по возврату на основе:
   * - Категории товара
   * - Оставшегося срока годности
   * - Времени вне контроля
   * - Состояния товара
   */
  recommendDecision(
    product: Product,
    batch: ProductBatch,
    timeOutOfControl: number,
    condition: ProductCondition,
  ): {
    decision: ReturnDecision;
    discountPercent?: number;
    reason: string;
  };

  /**
   * Проверить, можно ли принять возврат для категории
   */
  canAcceptReturn(product: Product): boolean;

  /**
   * Рассчитать новый срок годности после возврата
   */
  recalculateFreshnessAfterReturn(
    batch: ProductBatch,
    product: Product,
    timeOutOfControl: number,
    storageConditions: StorageZoneType,
  ): number;
}
```

---

### Фаза 6: Расширение StockMovement (оценка: 1-2 дня)

```typescript
// Добавить в stock-movement.schema.ts

@Prop({ type: Types.ObjectId, ref: Warehouse.name })
warehouse?: Types.ObjectId;

@Prop({ type: Types.ObjectId, ref: WarehouseProduct.name })
warehouseProduct?: Types.ObjectId;

@Prop({ type: Types.ObjectId, ref: ProductBatch.name })
batch?: Types.ObjectId;

@Prop({ type: String, enum: ['SHOP', 'WAREHOUSE'], required: true })
locationType: string;
```

---

### Фаза 7: Офлайн-продажи (оценка: 2 дня)

#### 7.1. Новый модуль OfflineSale или расширение Order

```typescript
// Вариант 1: Отдельный модуль src/modules/offline-sale/
// Вариант 2: Order с type = 'OFFLINE'

@Schema()
export class OfflineSale {
  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
  shop: Types.ObjectId;

  @Prop({ type: [OfflineSaleItemSchema], required: true })
  items: OfflineSaleItem[];

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: Boolean, default: false })
  usedReservedStock: boolean;         // Затронули резерв

  @Prop({ type: [Types.ObjectId], ref: Order.name, default: [] })
  affectedOrders: Types.ObjectId[];   // Какие заказы пострадали
}
```

#### 7.2. ConflictDetectionService

```typescript
@Injectable()
export class ConflictDetectionService {
  /**
   * Проверить, затрагивает ли продажа резервы
   */
  checkConflict(
    shopId: string,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<{
    hasConflict: boolean;
    availableWithoutReserve: number;
    reserveNeeded: number;
    affectedOrders: Order[];
  }>;
}
```

---

### Фаза 8: Синхронизация остатков (оценка: 2 дня)

Убрать дублирование `stockQuantity` в `ShopProduct`/`WarehouseProduct`.

**Вариант A: Virtual field**
```typescript
// В ShopProduct убрать @Prop stockQuantity, сделать virtual:
ShopProductSchema.virtual('stockQuantity').get(async function() {
  // Считать сумму BatchStock.quantity для этого shopProduct
});
```

**Вариант B: Денормализация с синхронизацией**
- Оставить `stockQuantity` как кэш
- Обновлять при каждом изменении `BatchStock`
- Добавить cron для сверки

**Рекомендация:** Вариант B — производительнее для чтения.

---

### Фаза 9: Cron Jobs и Алерты (оценка: 1-2 дня)

```typescript
@Injectable()
export class InventoryScheduler {
  @Cron('0 0 * * *') // Каждый день в полночь
  async recalculateExpirations(): Promise<void>;

  @Cron('0 8 * * *') // Каждый день в 8:00
  async sendExpirationAlerts(): Promise<void>;

  @Cron('0 1 * * *') // Каждый день в 1:00
  async autoWriteOffExpired(): Promise<void>;

  @Cron('0 */4 * * *') // Каждые 4 часа
  async syncAggregatedStocks(): Promise<void>;
}
```

---

## 5. Порядок миграции данных

### 5.1. Существующие ShopProduct → BatchStock

```javascript
// migration-script.js
// Для каждого ShopProduct с stockQuantity > 0:
// 1. Создать ProductBatch с expirationDate = now + 30 days (placeholder)
// 2. Создать BatchStock с quantity = ShopProduct.stockQuantity
// 3. Установить freshnessReserve = 30 (условных дней)
```

### 5.2. Существующие Receiving

```javascript
// Пометить как legacy, не конвертировать
// Новые приёмки будут создавать партии
```

---

## 6. Оценка трудозатрат

| Фаза | Описание | Оценка |
|------|----------|--------|
| 0 | Подготовка | 2 дня |
| 1 | Расширение схем | 3-4 дня |
| 2 | ShelfLifeCalculator | 2-3 дня |
| 3 | Переработка Receiving | 3-4 дня |
| 4 | Переработка Transfer | 2-3 дня |
| 5 | Модуль Return | 3-4 дня |
| 6 | Расширение StockMovement | 1-2 дня |
| 7 | Офлайн-продажи | 2 дня |
| 8 | Синхронизация остатков | 2 дня |
| 9 | Cron Jobs и Алерты | 1-2 дня |
| — | Тестирование и багфиксы | 3-4 дня |
| — | **Итого** | **24-32 дня** |

---

## 7. Риски и mitigation

| Риск | Вероятность | Влияние | Mitigation |
|------|-------------|---------|------------|
| Миграция сломает продакшн | Средняя | Высокое | Feature flags, постепенный rollout |
| Производительность упадёт | Средняя | Среднее | Индексы, кэширование, агрегация |
| Сложность интеграции | Высокая | Среднее | Чёткие контракты портов |
| Команда не понимает логику | Средняя | Среднее | Документация, code review |

---

## 8. Альтернативные подходы

### 8.1. Минимальный MVP
Реализовать только:
- Фаза 1 (схемы)
- Фаза 3 (Receiving с партиями)
- Фаза 4 (Transfer с партиями)

Без: динамических сроков, возвратов, офлайн-продаж.

**Оценка:** 10-12 дней

### 8.2. Параллельные системы
Оставить текущую систему для существующих магазинов, новую — для новых.

**Минусы:** Поддержка двух систем, путаница.

---

## 9. Следующие шаги

1. ✅ Создан план рефакторинга (этот документ)
2. ⏳ Обсудить с командой приоритеты
3. ⏳ Выбрать подход (полный vs MVP)
4. ⏳ Создать feature branch
5. ⏳ Начать с Фазы 1
