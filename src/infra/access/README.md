# Access Module

> `src/infra/access/`

Централизованная проверка прав доступа к ресурсам. Возвращает `Promise<boolean>` вместо выброса исключений.

## Структура

```
src/infra/access/
├── index.ts
├── access.module.ts
├── access.port.ts
└── access.service.ts
```

## Импорт

```typescript
import { AccessPort, ACCESS_PORT } from 'src/infra/access';

@Inject(ACCESS_PORT) private readonly accessPort: AccessPort
```

## API

### Seller → Resource

| Метод | Описание |
|-------|----------|
| `canSellerAccessShop(sellerId, shopId)` | Магазин принадлежит продавцу |
| `canSellerAccessProduct(sellerId, productId)` | Продукт принадлежит продавцу |
| `canSellerAccessShift(sellerId, shiftId)` | Смена принадлежит продавцу (через магазин) |
| `canSellerAccessShops(sellerId, shopIds[])` | Все магазины принадлежат продавцу |

### Shop → Resource

| Метод | Описание |
|-------|----------|
| `canShopAccessShift(shopId, shiftId)` | Смена принадлежит магазину |
| `canShopAccessProduct(shopId, productId)` | Продукт принадлежит магазину |

### Customer → Resource

| Метод | Описание |
|-------|----------|
| `canCustomerAccessOrder(customerId, orderId)` | Заказ принадлежит клиенту |
| `canCustomerAccessAddress(customerId, addressId)` | Адрес принадлежит клиенту |

### Helper Methods

Проверка + получение ресурса за один запрос:

| Метод | Возвращает |
|-------|------------|
| `getShopIfSellerHasAccess(sellerId, shopId)` | `Shop \| null` |
| `getProductIfSellerHasAccess(sellerId, productId)` | `Product \| null` |
| `getShiftIfSellerHasAccess(sellerId, shiftId)` | `Shift \| null` |
| `getOrderIfCustomerHasAccess(customerId, orderId)` | `Order \| null` |

## Использование

```typescript
@Injectable()
export class SellerShopsRoleService {
  constructor(
    @Inject(ACCESS_PORT) private readonly accessPort: AccessPort,
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
  ) {}

  async getShop(sellerId: string, shopId: string) {
    const hasAccess = await this.accessPort.canSellerAccessShop(sellerId, shopId);
    if (!hasAccess) {
      throw new NotFoundException('Магазин не найден');
    }

    return this.shopPort.getShop(new ShopQueries.GetShopQuery(shopId));
  }
}
```

## Особенности

### Fail-safe контракт
При любой ошибке (невалидный ID, проблемы с БД) возвращается `false`:

```typescript
async canSellerAccessShop(sellerId: string, shopId: string): Promise<boolean> {
  try {
    checkId([sellerId, shopId]);
    const exists = await this.shopModel.exists({
      _id: new Types.ObjectId(shopId),
      owner: new Types.ObjectId(sellerId),
    });
    return !!exists;
  } catch (error) {
    return false; // Fail-safe
  }
}
```

### Используемые схемы

| Схема | Проверяемое поле |
|-------|------------------|
| `Shop` | `owner` |
| `Product` | `owner`, `shop` |
| `Shift` | `shop` |
| `Order` | `customer` |
| `Address` | `entity`, `entityType` |

### Рекомендуемые индексы

```typescript
shopSchema.index({ _id: 1, owner: 1 });
productSchema.index({ _id: 1, owner: 1 });
shiftSchema.index({ _id: 1, shop: 1 });
orderSchema.index({ _id: 1, customer: 1 });
addressSchema.index({ entity: 1, entityType: 1 });
```

## Best Practices

```typescript
// ✅ Явная проверка с обработкой
const hasAccess = await accessPort.canSellerAccessShop(sellerId, shopId);
if (!hasAccess) {
  throw new NotFoundException('Магазин не найден');
}

// ✅ Использование helper-метода
const shop = await accessPort.getShopIfSellerHasAccess(sellerId, shopId);
if (!shop) throw new NotFoundException('Магазин не найден');

// ❌ Игнорирование результата
await accessPort.canSellerAccessShop(sellerId, shopId);
```

## Расширение

Для добавления новой проверки:

1. Добавьте метод в `AccessPort`
2. Реализуйте в `AccessService`
3. При необходимости добавьте схему в модуль
