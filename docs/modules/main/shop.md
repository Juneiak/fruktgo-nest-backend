# Shop Module

> **Модуль:** `src/modules/shop`  
> **Назначение:** хранение данных о торговых точках продавцов, включая SLA, статус и зависимости от адресов/финансов/смен.

---

## 1. Обзор

- Shop — агрегат верхнего уровня: владелец (`owner`), фин. счёт (`account`), параметры витрины и SLA;
- статус (`ShopStatus`) используется корзиной и оркестратором заказов для проверки доступности;
- адрес и изображение управляются через инфраструктурные порты (`AddressesPort`, `ImagesPort`);
- хранит статистику (рейтинг, продажи) и ссылки на текущую смену/активные заказы.

---

## 2. Схема данных (`shop.schema.ts`)

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` / `shopId` | `ObjectId` / виртуал | Уникальный идентификатор. |
| `city`, `shopName`, `aboutShop`, `shopImage` | `string`, `ObjectId<Image>` | Публичные параметры магазина. |
| `owner` | `ObjectId<Seller>` | Владелец. |
| `account` | `ObjectId<ShopAccount>` | Финансовый аккаунт (обязателен). |
| `address` | `ObjectId<Address> \ null` | Геоданные, создаются через AddressesPort. |
| `status` | `ShopStatus` | `CLOSED` по умолчанию. |
| `openAt`, `closeAt` | `string?` | Декларативный график. |
| `minOrderSum`, `acceptanceTimeLimit`, `assemblyTimeLimit`, `minWeightDifferencePercentage` | `number` | SLA и минимум заказа, дефолты из `common/constants`. |
| `blocked` | `Blocked` | Состояние блокировки с причиной/датой. |
| `verifiedStatus` | `VerifiedStatus` | Проверка админом. |
| `currentShift` | `ObjectId<Shift> \ null` | Ссылка на открытую смену. |
| `activeOrders` | `ObjectId<Order>[]` | Текущие заказы для мониторинга. |
| `statistics` | `ShopStatistics` | Рейтинги, кол-во товаров/заказов/сотрудников. |
| `sellerNote`, `internalNote` | `string?` | Служебные заметки. |
| `createdAt`, `updatedAt` | `Date` | Метаданные.

Плагины: `mongooseLeanVirtuals`, `mongoosePaginate`.

---

## 3. Enums (`shop.enums.ts`)

| Enum | Значения |
|------|----------|
| `ShopStatus` | `OPENED`, `CLOSED`, `PAUSED`. `OPENED` допустим только при активной смене; `PAUSED` временно прекращает приём заказов без закрытия смены. |

---

## 4. Commands (`shop.commands.ts`)

| Command | Входные данные | Логика |
|---------|----------------|--------|
| `CreateShopCommand` | `{ shopId, payload: { ownerId, shopAccountId, city, shopName, address?, aboutShop?, openAt?, closeAt?, minOrderSum?, shopImageFile? } }` | Создаёт магазин с `status=CLOSED`, проверяет уникальность имени в городе для владельца, при адресе вызывает `AddressesPort`, изображение — через `ImagesPort`. |
| `UpdateShopCommand` | `{ shopId, payload }` | Обновляет только переданные поля: базовые данные, SLA, заметки, статус (через `assignField`). При смене статуса проверяются бизнес-ограничения (например, нельзя `OPENED` без смены). Изображение заменяется через `ImagesPort`. |
| `BlockShopCommand` | `{ shopId, payload }` | Ставит блокировку (`blocked`), закрывает смену и активные заказы (через внешние процессы), выставляет `status=CLOSED`. |

---

## 5. Queries (`shop.queries.ts`)

- `GetShopQuery` — фильтры `shopId` или `shopAccountId`, опциональное `select`. Используется картой, заказами и финансами.
- `GetShopsQuery` — фильтры по `city`, `sellerId`, `statuses`, с `select` и пагинацией (`CommonListQueryOptions`).

Обе операции поддерживаются `ShopService` через `mongoose-paginate`/`lean`.

---

## 6. Port (`shop.port.ts`)

`SHOP_PORT` экспортирует методы:

| Метод | Назначение |
|-------|------------|
| `getShop`, `getShops` | Чтение с поддержкой `select`, транзакций (`session`) и пагинации. |
| `createShop` | Создание магазина внутри транзакции (применяется в онбординге продавца). |
| `updateShop` | Любые частичные обновления, в т.ч. из интерфейсов продавца/админа. |
| `blockShop` | Применяется админом для блокировки.

Все методы принимают `CommonQueryOptions`/`CommonCommandOptions` для работы в Mongo-транзакциях.

---

## 7. Service (`shop.service.ts`)

- реализует `ShopPort`, подключает `AddressesPort` и `ImagesPort` для вложенных сущностей;
- `createShop` проверяет конфликт по названию/городу владельца, создаёт сущность и при необходимости синхронно создаёт адрес;
- `updateShop` использует `assignField`, `selectFields` и обрабатывает изображение (загрузка через `UploadImageCommand`);
- `blockShop` сменяет статус, записывает блокировку и инициирует доменные действия (закрытие смены/заказов — через внешние процессы);
- Queries выполняются через `paginate`, с поддержкой `select` и `session`.

---

## 8. Связи и использование

- **Seller Module** — владелец магазина; валидация прав происходит на уровне интерфейсного слоя.
- **Finance / ShopAccount** — связь 1:1, аккаунт передаётся при создании.
- **Addresses / Images** — инфраструктурные порты для адреса и главного изображения.
- **Shift Module** — хранит ссылку на текущую смену; статус `OPENED` зависит от смены.
- **ShopProduct / Cart / Order** — чтение статуса и SLA при расчёте заказов и корзин.

---

## 9. Пример

```typescript
const createCommand = new CreateShopCommand({
  ownerId: sellerId,
  shopAccountId,
  city: 'Москва',
  shopName: 'Фруктовая лавка',
  minOrderSum: 500
}, new Types.ObjectId().toString());
const shop = await shopPort.createShop(createCommand);

await shopPort.updateShop(new UpdateShopCommand(shop.shopId, {
  status: ShopStatus.PAUSED,
  sellerNote: 'Перерыв на ремонт'
}));

const list = await shopPort.getShops(new GetShopsQuery({ sellerId }), {
  pagination: { page: 1, pageSize: 10 }
});
```

---

> Документ следует структуре `docs/modules/README.md`. При изменении схемы, команд или зависимостей обновляйте разделы выше.
