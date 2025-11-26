# Модуль: Cart

**Путь:** `src/modules/cart/`  
**Зависимости:** Shop, ShopProduct, Shift

---

## Назначение

Модуль управления корзиной клиента. Отвечает за временное хранение выбранных товаров перед оформлением заказа.

**Ключевые особенности:**
- Корзина привязана к одному магазину
- Автоматический пересчёт суммы при изменениях
- Валидация доступности товаров и остатков
- Интеграция с процессом checkout

---

## Структура файлов

```
src/modules/cart/
├── cart.schema.ts      # Mongoose схема
├── cart.enums.ts       # Статусы корзины
├── cart.commands.ts    # Команды (изменение состояния)
├── cart.queries.ts     # Запросы (чтение данных)
├── cart.port.ts        # Интерфейс порта
├── cart.service.ts     # Реализация порта
├── cart.module.ts      # NestJS модуль
└── index.ts            # Barrel export
```

---

## Схема данных

```typescript
interface Cart {
  _id: ObjectId;
  cartId: string;              // Virtual field
  
  customer: ObjectId;          // ref: Customer (unique)
  selectedShop: ObjectId;      // ref: Shop
  
  products: CartProduct[];
  totalSum: number;            // Автоматически пересчитывается
  
  deliveryInfo: {
    addressId: ObjectId;       // ref: Address
    price: number;             // Стоимость доставки
    estimatedTime: number;     // Минуты
  };
  
  isReadyToOrder: boolean;     // Флаг готовности к checkout
  
  createdAt: Date;
  updatedAt: Date;
}

interface CartProduct {
  shopProduct: ObjectId;       // ref: ShopProduct
  selectedQuantity: number;
}
```

---

## Статусы корзины

```typescript
enum CartStatus {
  EMPTY = 'empty',                    // Пустая корзина
  SHOP_SELECTED = 'shop_selected',    // Магазин выбран
  HAS_PRODUCTS = 'has_products',      // Есть товары
  DELIVERY_SET = 'delivery_set',      // Доставка установлена
  READY_TO_ORDER = 'ready_to_order',  // Готова к checkout
}
```

---

## Порт (API модуля)

### Queries

| Метод | Описание |
|-------|----------|
| `getCart(query)` | Получить корзину клиента |
| `validateCart(query)` | Валидировать корзину перед checkout |

### Commands

| Метод | Описание |
|-------|----------|
| `createCart(command)` | Создать корзину для клиента |
| `selectShop(command)` | Выбрать магазин |
| `unselectShop(command)` | Убрать магазин (очистить корзину) |
| `addProduct(command)` | Добавить товар в корзину |
| `updateProductQuantity(command)` | Изменить количество товара |
| `removeProduct(command)` | Удалить товар из корзины |
| `setDelivery(command)` | Установить адрес доставки |
| `clearCart(command)` | Очистить корзину |

---

## Использование

### Импорт

```typescript
import {
  CartModule,
  CartPort,
  CART_PORT,
  CartCommands,
  CartQueries,
  CartEnums,
} from 'src/modules/cart';
```

### Инжекция

```typescript
@Inject(CART_PORT) private readonly cartPort: CartPort
```

### Примеры

```typescript
// Получить корзину
const cart = await this.cartPort.getCart(
  new CartQueries.GetCartQuery(customerId, { populateProducts: true })
);

// Выбрать магазин
await this.cartPort.selectShop(
  new CartCommands.SelectShopCommand(customerId, { shopId, force: true })
);

// Добавить товар
await this.cartPort.addProduct(
  new CartCommands.AddProductCommand(customerId, { shopProductId, quantity: 2 })
);

// Валидировать корзину
const validation = await this.cartPort.validateCart(
  new CartQueries.ValidateCartQuery(customerId)
);
if (!validation.isValid) {
  // Обработать ошибки validation.errors
}

// Очистить после checkout
await this.cartPort.clearCart(
  new CartCommands.ClearCartCommand(customerId)
);
```

---

## Бизнес-правила

1. **Один магазин:** Корзина содержит товары только из одного магазина
2. **Автоочистка при смене магазина:** При выборе другого магазина корзина очищается (требуется `force: true`)
3. **Валидация остатков:** Количество товара не может превышать `stockQuantity`
4. **Пересчёт суммы:** `totalSum` пересчитывается автоматически при любом изменении
5. **Готовность к заказу:** `isReadyToOrder = true` только если есть товары, магазин и доставка

---

## Связанные процессы

- **[cart-flow.md](../../processes/cart-flow.md)** — Полный процесс работы корзины
- **[order-flow.md](../../processes/order-flow.md)** — Использование корзины при checkout

---

## События

Модуль не эмитит события напрямую. События эмитятся в `OrderProcessOrchestrator` после checkout.

---

## TODO

- [ ] Расчёт стоимости доставки на основе расстояния
- [ ] Валидация адреса принадлежности клиенту
- [ ] Автоматическая очистка устаревших товаров
- [ ] События изменения корзины для real-time уведомлений
