# Access Infrastructure Module

Глобальный инфраструктурный слой, который отвечает за централизованную проверку прав доступа «кто → к какому ресурсу». Модуль предоставляет единый `AccessPort`, возвращающий `Promise<boolean>` вместо выброса исключений, поэтому роль‑сервисы сами решают, какую HTTP‑ошибку формировать.

## 1. Обзор

- поддерживает продавцов, магазины и клиентов;
- изолирован от бизнес‑логики — работает только с Mongoose‑схемами;
- подключается в `AppModule` как `@Global()` и доступен во всех DI‑контекстах;
- helper‑методы (`getShopIfSellerHasAccess` и т.д.) комбинируют проверку и загрузку данных.

## 2. Схема данных

Модуль не объявляет собственных документов, но подключает следующие схемы:

| Сущность | Поля, используемые AccessService | Индексы
| --- | --- | --- |
| `Shop` (`owner`) | сверяет владельца по `owner` | `{ _id: 1, owner: 1 }`
| `Product` (`owner`, `shop`) | ищет продукт продавца или магазина | `{ _id: 1, owner: 1 }`, `{ _id: 1, shop: 1 }`
| `Shift` (`shop`) | проверяет принадлежность смены магазину/продавцу | `{ _id: 1, shop: 1 }`
| `Order` (`customer`) | проверяет, принадлежит ли заказ клиенту | `{ _id: 1, customer: 1 }`
| `Address` (`entityType`, `entity`) | проверяет принадлежность адреса клиенту | `{ entityType: 1, entity: 1 }`

## 3. Енумы

Собственные enum'ы отсутствуют — используются перечисления из соответствующих доменных модулей.

## 4. Commands / Queries

Отсутствуют: модуль предоставляет только набор проверок (boolean) и helper‑методы.

## 5. Port

```typescript
export interface AccessPort {
  canSellerAccessShop(sellerId: string, shopId: string): Promise<boolean>;
  canSellerAccessProduct(sellerId: string, productId: string): Promise<boolean>;
  canSellerAccessShift(sellerId: string, shiftId: string): Promise<boolean>;
  canSellerAccessShops(sellerId: string, shopIds: string[]): Promise<boolean>;

  canShopAccessShift(shopId: string, shiftId: string): Promise<boolean>;
  canShopAccessProduct(shopId: string, productId: string): Promise<boolean>;

  canCustomerAccessOrder(customerId: string, orderId: string): Promise<boolean>;
  canCustomerAccessAddress(customerId: string, addressId: string): Promise<boolean>;

  getShopIfSellerHasAccess(...): Promise<Shop | null>;
  getProductIfSellerHasAccess(...): Promise<Product | null>;
  getShiftIfSellerHasAccess(...): Promise<Shift | null>;
  getOrderIfCustomerHasAccess(...): Promise<Order | null>;
}

export const ACCESS_PORT = 'ACCESS_PORT';
```

## 6. Service

`AccessService` реализует порт и подключает модели через `@InjectModel`. Важные аспекты:

1. **Boolean‑контракт.** Любая ошибка (невалидный ObjectId, проблемы с БД) приводит к `false`, чтобы верхний слой не оборачивал каждый вызов в try/catch.
2. **Проверки ID.** Перед запросами вызывается `checkId` из `src/common/utils` — защищает от `CastError`.
3. **Helper‑методы.** Возвращают документ с `lean({ virtuals: true })`, если проверка прошла.
4. **Fail‑safe.** Никакие HTTP‑исключения внутри сервиса не кидаются — ответственность целиком на вызывающем коде.

## 7. Связи и использование

```typescript
@Injectable()
export class SellerShiftsRoleService {
  constructor(
    @Inject(ACCESS_PORT) private readonly accessPort: AccessPort,
    @Inject(SHIFT_PORT) private readonly shiftPort: ShiftPort,
  ) {}

  async getShift(authedSeller: AuthenticatedUser, shiftId: string) {
    const hasAccess = await this.accessPort.canSellerAccessShift(authedSeller.id, shiftId);
    if (!hasAccess) {
      throw new NotFoundException('Смена не найдена или не принадлежит продавцу');
    }

    const shift = await this.shiftPort.getShift(new ShiftQueries.GetShiftQuery(shiftId));
    if (!shift) throw new NotFoundException('Смена не найдена');

    return plainToInstance(ShiftResponseDto, shift, { excludeExtraneousValues: true });
  }
}
```

- Модуль подключается единожды ( `AccessModule` ) и экспортирует только `ACCESS_PORT`.
- Используется Role‑сервисами всех интерфейсных слоёв: они превращают `false` в `NotFoundException`/`ForbiddenException` в зависимости от сценария.
- При добавлении новой проверки сначала расширяют порт (интерфейс + DI‑token), затем реализацию в `AccessService`.

