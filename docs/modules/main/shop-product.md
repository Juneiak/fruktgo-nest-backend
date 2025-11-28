# Shop-Product Module

> **Модуль:** `src/modules/shop-product`  
> **Назначение:** связь продукта с конкретным магазином, учёт остатков, статуса и изображений.

---

## 1. Обзор

- агрегирует состояние товара для магазина: остатки, локальный статус, изображения;
- статус автоматически синхронизируется с остатками (`stockQuantity = 0 → OUT_OF_STOCK`);
- поддерживает массовое изменение остатков и загрузку изображений через `ImagesPort`;
- используется витринами и корзиной — единственный источник правды по доступности.

---

## 2. Схема данных (`shop-product.schema.ts`)

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` / `shopProductId` | `ObjectId` / виртуал | Уникальный идентификатор, экспортируется в API. |
| `pinnedTo` | `ObjectId<Shop>` | Магазин, к которому прикреплён товар. |
| `product` | `ObjectId<Product>` | Базовый товар каталога. |
| `stockQuantity` | `number` | Остаток в магазине, `min:0`, дефолт `0`. |
| `status` | `ShopProductStatus` | Состояние отображения в витрине. |
| `last7daysSales` / `last7daysWriteOff` | `number` | Локальные метрики продаж и списаний. |
| `images` | `ObjectId<Image>[]` | Доп. изображения магазина. |
| `createdAt`, `updatedAt` | `Date` | Метаданные.

Плагины: `mongooseLeanVirtuals`, `mongoosePaginate`.

---

## 3. Enums (`shop-product.enums.ts`)

| Enum | Значения / комментарии |
|------|------------------------|
| `ShopProductStatus` | `ACTIVE`, `PAUSED`, `OUT_OF_STOCK`, `ARCHIVED`. `OUT_OF_STOCK` выставляется при нулевом остатке, `ARCHIVED` скрывает товар навсегда. |

---

## 4. Commands (`shop-product.commands.ts`)

| Command | Поля | Логика |
|---------|------|--------|
| `CreateShopProductCommand` | `shopProductId`, `productId`, `shopId`, `stockQuantity?`, `status?` | Создаёт документ, рассчитывает стартовый статус (`OUT_OF_STOCK`, если 0), проверяет валидность ID. |
| `UpdateShopProductCommand` | `shopProductId`, `{ stockQuantity?, status? }` | Обновляет остаток и статус (если остаток ≠ 0). При `stockQuantity = 0` статус форсируется в `OUT_OF_STOCK`. |
| `ArchiveShopProductCommand` | `shopProductId` | Ставит статус `ARCHIVED`, очищает изображения (через сервис). |
| `AddShopProductImageCommand` | `shopProductId`, `shopProductImageFile` | Создаёт `Image` через `ImagesPort`, добавляет ссылку. |
| `RemoveShopProductImageCommand` | `shopProductId`, `shopProductImageId` | Удаляет объект через `ImagesPort`, вырезает ID из массива. |
| `AdjustStockQuantityCommand` | `shopProductId`, `{ adjustment }` | Инкрементально меняет остаток (`$inc`). |
| `BulkAdjustStockQuantityCommand` | `items[{ shopProductId, adjustment }]` | Пакетное `$inc` по списку товаров. |

---

## 5. Queries (`shop-product.queries.ts`)

- `GetShopProductQuery` — получение одной записи по ID; поддерживает `select`, `populateImages`, `populateProduct`.
- `GetShopProductsQuery` — фильтры по `shopId`, `productId`, `statuses`, `populateImages`, `populateProduct`, пагинация через `CommonListQueryOptions`.
- `GetShopProductsByIdsQuery` — массовая загрузка по списку ID с опциональным `populateProduct` (используется корзиной/заказом).
- `GetShopProductsStockQuery` существует, но в сервисе не используется (помечен `TODO`).

---

## 6. Port (`shop-product.port.ts`)

`SHOP_PRODUCT_PORT` объединяет чтение и команды:
- Queries: `getShopProduct`, `getShopProducts`, `getShopProductsByIds`.
- Commands: `createShopProduct`, `updateShopProduct`, `archiveShopProduct`, `addShopProductImage`, `removeShopProductImage`, `adjustStockQuantity`, `bulkAdjustStockQuantity`.

Методы принимают `CommonQueryOptions`/`CommonCommandOptions` для `session`, `select`, пагинации.

---

## 7. Service (`shop-product.service.ts`)

- реализует `ShopProductPort`, работает с `ShopProductModel` и `ImagesPort`;
- `createShopProduct` формирует статус на основе начального остатка;
- `updateShopProduct` обновляет поле через `assignField`, автоматически выставляя `OUT_OF_STOCK` при нуле;
- `archiveShopProduct` удаляет связанные изображения перед установкой `ARCHIVED`;
- `add/removeShopProductImage` загружает/удаляет файлы через `ImagesPort`, поддерживает транзакции (`commandOptions.session`);
- `adjustStockQuantity` и `bulkAdjustStockQuantity` используют `$inc`/`bulkWrite`, что минимизирует блокировки;
- Queries поддерживают выборку только нужных полей и populate (product, images).

---

## 8. Связи и использование

- **Product Module** — поставляет базовые данные товара, ShopProduct хранит ссылку и не дублирует характеристики.
- **Shop Module** — владеет ShopProduct (поле `pinnedTo`), витрина строится по этим данным.
- **Images Module** — инфраструктурная зависимость для загрузки/удаления фотографий.
- **Cart / Order процессы** — читают `ShopProduct` для проверки остатка и стоимости перед оформлением.

---

## 9. Пример использования порта

```typescript
const createCommand = new CreateShopProductCommand(new Types.ObjectId().toString(), {
  productId: baseProductId,
  shopId,
  stockQuantity: 25
});
const shopProduct = await shopProductPort.createShopProduct(createCommand);

await shopProductPort.adjustStockQuantity(new AdjustStockQuantityCommand(shopProduct.shopProductId!, {
  adjustment: -3
}));

const query = new GetShopProductsQuery({ shopId, statuses: [ShopProductStatus.ACTIVE] }, { populateProduct: true });
const page = await shopProductPort.getShopProducts(query, { pagination: { page: 1, pageSize: 20 } });
```

---

> Документ следует структуре `docs/modules/README.md`. При изменении схемы, команд или зависимостей обновляйте разделы выше.
