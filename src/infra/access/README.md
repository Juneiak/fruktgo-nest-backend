# Access Infrastructure Module

Глобальный инфраструктурный модуль для централизованной проверки прав доступа к ресурсам.

## Назначение

Универсальный модуль для проверки прав доступа различных типов пользователей к ресурсам:
- **Seller** → Shop, Product, Shift
- **Shop** → Shift, Product  
- **Customer** → Order, Address

## Ключевые особенности

### 1. Булевые проверки
Все методы возвращают `Promise<boolean>` вместо выброса исключений:

```typescript
const hasAccess = await accessPort.canSellerAccessShop(sellerId, shopId);
if (!hasAccess) {
  throw new NotFoundException('Магазин не найден или не принадлежит продавцу');
}
```

**Преимущества:**
- Явный контроль потока выполнения
- Гибкость в обработке ошибок
- Можно использовать в условиях без try-catch

### 2. Семантические названия методов
Названия методов явно показывают **КТО** проверяет доступ к **ЧЕМУ**:

```typescript
// ✅ Понятно: продавец проверяет доступ к магазину
canSellerAccessShop(sellerId, shopId)

// ✅ Понятно: клиент проверяет доступ к заказу  
canCustomerAccessOrder(customerId, orderId)

// ✅ Понятно: магазин проверяет доступ к смене
canShopAccessShift(shopId, shiftId)
```

### 3. Инфраструктурный уровень
- Использует **только схемы Mongoose**, не импортирует модули
- Избегает циклических зависимостей
- Независимый от доменной логики

### 4. Глобальный модуль
```typescript
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shop.name, schema: ShopSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  exports: [ACCESS_PORT],
})
export class AccessModule {}
```

## API Reference

### Seller Access Methods

#### `canSellerAccessShop(sellerId: string, shopId: string): Promise<boolean>`
Проверяет, принадлежит ли магазин продавцу.

```typescript
const hasAccess = await accessPort.canSellerAccessShop(sellerId, shopId);
if (!hasAccess) {
  throw new NotFoundException('Магазин не найден');
}
```

#### `canSellerAccessProduct(sellerId: string, productId: string): Promise<boolean>`
Проверяет, принадлежит ли продукт продавцу через магазин.

```typescript
const hasAccess = await accessPort.canSellerAccessProduct(sellerId, productId);
if (!hasAccess) {
  throw new NotFoundException('Продукт не найден');
}
```

#### `canSellerAccessShift(sellerId: string, shiftId: string): Promise<boolean>`
Проверяет, принадлежит ли смена продавцу через магазин.

```typescript
const hasAccess = await accessPort.canSellerAccessShift(sellerId, shiftId);
if (!hasAccess) {
  throw new NotFoundException('Смена не найдена');
}
```

#### `canSellerAccessShops(sellerId: string, shopIds: string[]): Promise<boolean>`
Проверяет несколько магазинов за один запрос.

```typescript
const shopIds = products.map(p => p.shop.toString());
const hasAccess = await accessPort.canSellerAccessShops(sellerId, shopIds);
if (!hasAccess) {
  throw new NotFoundException('Один или несколько магазинов недоступны');
}
```

### Shop Access Methods

#### `canShopAccessShift(shopId: string, shiftId: string): Promise<boolean>`
Проверяет, принадлежит ли смена магазину.

```typescript
const hasAccess = await accessPort.canShopAccessShift(shopId, shiftId);
```

#### `canShopAccessProduct(shopId: string, productId: string): Promise<boolean>`
Проверяет, принадлежит ли продукт магазину.

```typescript
const hasAccess = await accessPort.canShopAccessProduct(shopId, productId);
```

### Customer Access Methods

#### `canCustomerAccessOrder(customerId: string, orderId: string): Promise<boolean>`
Проверяет, принадлежит ли заказ клиенту.

```typescript
const hasAccess = await accessPort.canCustomerAccessOrder(customerId, orderId);
```

#### `canCustomerAccessAddress(customerId: string, addressId: string): Promise<boolean>`
Проверяет, принадлежит ли адрес клиенту.

```typescript
const hasAccess = await accessPort.canCustomerAccessAddress(customerId, addressId);
```

### Helper Methods

Методы которые проверяют доступ И возвращают ресурс:

#### `getShopIfSellerHasAccess(sellerId: string, shopId: string): Promise<Shop | null>`
```typescript
const shop = await accessPort.getShopIfSellerHasAccess(sellerId, shopId);
if (!shop) throw new NotFoundException('Магазин не найден');
```

#### `getProductIfSellerHasAccess(sellerId: string, productId: string): Promise<Product | null>`
#### `getShiftIfSellerHasAccess(sellerId: string, shiftId: string): Promise<Shift | null>`
#### `getOrderIfCustomerHasAccess(customerId: string, orderId: string): Promise<Order | null>`

## Использование

### 1. Регистрация в AppModule

```typescript
// src/app.module.ts
import { AccessModule } from './infra/access';

@Module({
  imports: [
    // ... другие модули
    AccessModule,
  ],
})
export class AppModule {}
```

### 2. Инъекция в Role Services

```typescript
import { AccessPort, ACCESS_PORT } from 'src/infra/access';

@Injectable()
export class SellerShiftsRoleService {
  constructor(
    @Inject(SHIFT_PORT) private readonly shiftPort: ShiftPort,
    @Inject(ACCESS_PORT) private readonly accessPort: AccessPort,
  ) {}

  async getShifts(authedSeller: AuthenticatedUser, shiftsQueryDto: ShiftsQueryDto) {
    // Проверка доступа
    const hasAccess = await this.accessPort.canSellerAccessShop(
      authedSeller.id,
      shiftsQueryDto.shopId
    );
    if (!hasAccess) {
      throw new NotFoundException('Магазин не найден или не принадлежит продавцу');
    }

    // Продолжить работу...
  }
}
```

## Производительность

### Стоимость проверок (с индексами)

| Метод | Время | Оптимизация |
|-------|-------|-------------|
| `canSellerAccessShop` | ~0.1ms | `{ _id: 1, owner: 1 }` |
| `canSellerAccessProduct` | ~0.2ms | 2 запроса |
| `canSellerAccessShift` | ~0.2ms | 2 запроса |
| `canSellerAccessShops` | ~0.5ms | 1 запрос с `$in` |
| `getShopIfSellerHasAccess` | ~0.1ms | 1 запрос вместо 2 |

### Рекомендуемые индексы

```typescript
// Shop schema
shopSchema.index({ _id: 1, owner: 1 });

// Product schema
productSchema.index({ _id: 1, shop: 1 });

// Shift schema
shiftSchema.index({ _id: 1, shop: 1 });

// Order schema
orderSchema.index({ _id: 1, customer: 1 });

// Address schema
addressSchema.index({ _id: 1, entityId: 1, entityType: 1 });
```

## Расширение функциональности

### Добавление новой проверки

1. Добавьте схему в модуль:
```typescript
MongooseModule.forFeature([
  { name: Employee.name, schema: EmployeeSchema },
]),
```

2. Добавьте метод в порт:
```typescript
canShopAccessEmployee(shopId: string, employeeId: string): Promise<boolean>;
```

3. Реализуйте метод в сервисе:
```typescript
async canShopAccessEmployee(shopId: string, employeeId: string): Promise<boolean> {
  try {
    checkId([shopId, employeeId]);

    const exists = await this.employeeModel.exists({
      _id: new Types.ObjectId(employeeId),
      pinnedTo: new Types.ObjectId(shopId),
    });

    return !!exists;
  } catch (error) {
    return false;
  }
}
```

## Безопасность

### Принципы
- **Fail-safe**: При любой ошибке возвращается `false`
- **Explicit checks**: Проверки должны быть явными в коде
- **Single source of truth**: Логика проверки централизована

### Best Practices

```typescript
// ✅ Хорошо - явная проверка с правильной обработкой
const hasAccess = await accessPort.canSellerAccessShop(sellerId, shopId);
if (!hasAccess) {
  throw new NotFoundException('Магазин не найден');
}

// ❌ Плохо - игнорирование результата
await accessPort.canSellerAccessShop(sellerId, shopId); // Что делать с false?

// ✅ Хорошо - проверка перед мутацией
const hasAccess = await accessPort.canSellerAccessProduct(sellerId, productId);
if (!hasAccess) {
  throw new NotFoundException('Продукт не найден');
}
await productPort.updateProduct(command);

// ❌ Плохо - мутация без проверки
await productPort.updateProduct(command);
```

## Миграция с AuthorizationModule

### До (AuthorizationModule)
```typescript
await authorizationPort.verifyShopOwnership(sellerId, shopId);
// Бросает NotFoundException автоматически
```

### После (AccessModule)
```typescript
const hasAccess = await accessPort.canSellerAccessShop(sellerId, shopId);
if (!hasAccess) {
  throw new NotFoundException('Магазин не найден');
}
```

**Преимущества нового подхода:**
- ✅ Явный контроль ошибок
- ✅ Гибкость в обработке
- ✅ Можно использовать в условиях
- ✅ Более функциональный стиль

## Тестирование

```typescript
describe('AccessService', () => {
  it('should return true if seller owns shop', async () => {
    const result = await accessPort.canSellerAccessShop(sellerId, shopId);
    expect(result).toBe(true);
  });

  it('should return false if seller does not own shop', async () => {
    const result = await accessPort.canSellerAccessShop(otherSellerId, shopId);
    expect(result).toBe(false);
  });

  it('should return false on error', async () => {
    const result = await accessPort.canSellerAccessShop('invalid', shopId);
    expect(result).toBe(false);
  });
});
```

## Сравнение подходов

| Критерий | AuthorizationModule | AccessModule |
|----------|---------------------|--------------|
| Возвращаемое значение | `void` (бросает исключение) | `boolean` |
| Контроль ошибок | Автоматический | Явный |
| Гибкость | Низкая | Высокая |
| Использование в условиях | Требует try-catch | Прямое |
| Семантика | `verifyShopOwnership` | `canSellerAccessShop` |
| Универсальность | Только Seller | Seller, Shop, Customer |
