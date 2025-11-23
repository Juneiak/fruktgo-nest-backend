# Процесс: Управление каталогом

**Участники:** Seller, Shop, PlatformStaff  
**Зависимости:** Product Module, Shop-Product Module

---

## Обзор

Двухуровневая модель управления товарами:
- **Product** - мастер-каталог продавца (общие товары)
- **ShopProduct** - товары в конкретных магазинах (остатки, статусы)

**Workflow:** Seller создаёт Product → прикрепляет к магазинам → создаются ShopProduct

---

## 1. Создание товара (Product)

**Актор:** Seller

### Основной сценарий

1. Seller в панели → "Товары" → "Создать товар"
2. Заполнение данных:
   - Название (обязательно)
   - Категория: фрукты, овощи, орехи, сухофрукты, прочее
   - Цена (₽)
   - Единица измерения: КГ или ШТ
   - Шаг продажи: 0.1, 0.2, 0.5, 1, 2, 5, 10
   - Описание (опционально)
   - Происхождение (опционально)
   - Артикул (опционально)
   - Изображение (опционально)
3. Система создаёт `Product`:
   ```typescript
   {
     productName: "Яблоко Гала",
     category: "fruits",
     price: 250,
     measuringScale: "kg",
     stepRate: "0.5",  // Продается по 0.5кг
     owner: sellerId,
     totalStockQuantity: 0  // Пока не прикреплен к магазинам
   }
   ```
4. Обновление: `seller.statistics.productsCount++`

**API:** `POST /seller/products`

### Бизнес-правила

- Товар создаётся в статусе "готов к прикреплению"
- `totalStockQuantity = 0` до прикрепления к магазинам
- Изображение необязательно, но рекомендуется
- Цена устанавливается в Product, применяется ко всем ShopProduct

---

## 2. Прикрепление к магазину (ShopProduct)

**Актор:** Seller

### Основной сценарий

1. Seller выбирает Product → "Прикрепить к магазину"
2. Выбор магазина из списка своих магазинов
3. Указание начальных остатков (опционально, default: 0)
4. Система проверяет:
   - Product принадлежит владельцу Shop? ✓
   - Товар ещё не прикреплен к этому магазину? ✓
5. Создание `ShopProduct`:
   ```typescript
   {
     product: productId,
     pinnedTo: shopId,
     stockQuantity: 50,  // Начальные остатки
     status: "active",   // Доступен для заказа
     last7daysSales: 0,
     last7daysWriteOff: 0,
     images: []  // Дополнительные фото (специфично для магазина)
   }
   ```
6. Обновления:
   - `product.totalStockQuantity += 50`
   - `shop.statistics.productsCount++`

**API:** `POST /seller/shop-products`

### Альтернативные сценарии

- **Товар уже прикреплен:** ошибка `CONFLICT`, предложить редактировать существующий
- **Product не принадлежит Seller:** ошибка `FORBIDDEN`

---

## 3. Управление остатками

**Актор:** Seller / Employee (через Shop)

### Обновление остатков

1. В панели магазина → выбор товара → изменение `stockQuantity`
2. Система обновляет:
   - `shopProduct.stockQuantity`
   - `product.totalStockQuantity` (пересчёт по всем магазинам)
3. **Если `stockQuantity = 0`:**
   - Автоматически: `shopProduct.status = OUT_OF_STOCK`
   - Товар скрывается из публичного каталога

**API:** `PATCH /seller/shop-products/:id`

### Статусы ShopProduct

| Статус | Описание | Видимость |
|--------|----------|-----------|
| `ACTIVE` | Активен, доступен | ✅ Показывается |
| `PAUSED` | Приостановлен | ❌ Скрыт |
| `OUT_OF_STOCK` | Нет в наличии | ❌ Скрыт |
| `ARCHIVED` | Архивирован | ❌ Удалён из витрины |

---

## 4. Дополнительные изображения

**Актор:** Seller

Магазин может добавить свои фотографии товара (специфичные для конкретной точки):

1. Выбор ShopProduct → "Добавить изображение"
2. Загрузка фото → добавление в `shopProduct.images[]`
3. Клиент видит и основное фото из Product, и дополнительные из ShopProduct

**API:**
- `POST /seller/shop-products/:id/images`
- `DELETE /seller/shop-products/:id/images/:imageId`

---

## 5. Архивирование (открепление)

**Актор:** Seller

Если товар больше не продаётся в магазине:

1. Seller → "Архивировать товар"
2. Статус: `shopProduct.status = ARCHIVED`
3. Товар скрывается из витрины магазина
4. Пересчёт: `product.totalStockQuantity` (минус остатки этого магазина)

**API:** `DELETE /seller/shop-products/:id`

**Важно:** Product остаётся в мастер-каталоге, удаляется только привязка к магазину

---

## 6. Редактирование товара

**Актор:** Seller

### Изменение Product

Изменения в Product применяются ко всем прикреплённым магазинам:

1. Seller редактирует Product (название, цена, категория и т.д.)
2. **При изменении цены:**
   - Обновляется `product.price`
   - Автоматически применяется во всех ShopProduct
3. **При изменении изображения:**
   - Старое изображение удаляется
   - Новое применяется ко всем магазинам

**API:** `PATCH /seller/products/:id`

### Изменение ShopProduct

Изменения только для конкретного магазина:
- Остатки
- Статус
- Дополнительные изображения

**API:** `PATCH /seller/shop-products/:id`

---

## 7. Публичный каталог

**Актор:** Customer (без авторизации)

Клиент видит только активные товары с остатками:

1. Выбор магазина на карте или из списка
2. Просмотр каталога магазина
3. **Автофильтрация:**
   - `shopProduct.status = ACTIVE`
   - `shopProduct.stockQuantity > 0`
4. Клиент видит:
   - Данные Product (название, цена, категория)
   - Остатки из ShopProduct
   - Изображения (основное + дополнительные)

**API:** `GET /public/shop-products?shopId=...`

---

## Техническая сводка

### Сущности

**Product (мастер-каталог):**
- Общий товар продавца
- Базовая цена и параметры
- Агрегированные остатки (`totalStockQuantity`)
- Статистика продаж

**ShopProduct (товары в магазинах):**
- Привязка Product к Shop
- Локальные остатки (`stockQuantity`)
- Статус доступности
- Дополнительные изображения
- Локальная статистика

### API

**Product:**
- `POST /seller/products` - создать
- `GET /seller/products` - мои товары
- `GET /seller/products/:id` - детали
- `PATCH /seller/products/:id` - обновить
- `DELETE /seller/products/:id` - удалить

**ShopProduct:**
- `POST /seller/shop-products` - прикрепить к магазину
- `GET /seller/shop-products` - товары моих магазинов
- `GET /seller/shop-products/:id` - детали
- `PATCH /seller/shop-products/:id` - обновить (остатки, статус)
- `DELETE /seller/shop-products/:id` - архивировать
- `POST /seller/shop-products/:id/images` - добавить фото
- `DELETE /seller/shop-products/:id/images/:imageId` - удалить фото

**Public:**
- `GET /public/shop-products?shopId=...` - каталог магазина
- `GET /public/shop-products/:id` - детали товара

### Связи

```
Seller
  └── Product (мастер-каталог)
       ├── category, price, measuringScale, stepRate
       └── ShopProduct (в магазинах)
            ├── Shop A: 50кг, ACTIVE
            ├── Shop B: 30кг, ACTIVE
            └── Shop C: 0кг, OUT_OF_STOCK
```

### Ключевые правила

1. **Product → ShopProduct:** один Product → много ShopProduct (разные магазины)
2. **totalStockQuantity:** автоматически рассчитывается как сумма всех shopProduct.stockQuantity
3. **Цена единая:** цена из Product применяется ко всем магазинам
4. **Статусы независимы:** один товар может быть ACTIVE в одном магазине и PAUSED в другом
5. **Удаление Product:** удаляются все связанные ShopProduct

---

## Примеры

### Полный цикл

```typescript
// 1. Создание товара
const product = await productPort.createProduct({
  sellerId: '507f...',
  productName: 'Яблоко Гала',
  category: 'fruits',
  price: 250,
  measuringScale: 'kg',
  stepRate: '0.5'
});

// 2. Прикрепление к магазину
const shopProduct1 = await shopProductPort.createShopProduct({
  productId: product.productId,
  shopId: 'shop1',
  stockQuantity: 50
});

// 3. Прикрепление к другому магазину
const shopProduct2 = await shopProductPort.createShopProduct({
  productId: product.productId,
  shopId: 'shop2',
  stockQuantity: 30
});

// Теперь product.totalStockQuantity = 80

// 4. Обновление остатков в магазине 1
await shopProductPort.updateShopProduct({
  shopProductId: shopProduct1.shopProductId,
  stockQuantity: 40  // Продали 10кг
});

// product.totalStockQuantity = 70

// 5. Клиент видит товар в каталоге магазина 1
GET /public/shop-products?shopId=shop1
// Ответ: [{ productName: "Яблоко Гала", price: 250, stockQuantity: 40 }]
```

---

> **Статус:** ✅ Готов  
> **Обновлено:** 2024-11-23
