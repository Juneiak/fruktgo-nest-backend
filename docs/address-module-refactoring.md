# Рефакторинг модуля адресов

## 📋 Обзор изменений

Выполнен рефакторинг модулей `Shop` и `Customer` для работы с обновленным инфраструктурным модулем адресов `src/infra/addresses`. Основное изменение - управление выбранным адресом теперь происходит через схему сущности, а не через поле `isDefault` в самих адресах.

---

## 🎯 Архитектурные решения

### 1. **Удалено поле isDefault из Address**

**Было:**
```typescript
@Prop({ type: Boolean, default: false })
isDefault?: boolean;
```

**Стало:** Поле удалено из схемы `Address`

**Обоснование:**
- Выбранный адрес - это характеристика сущности (Shop/Customer), а не самого адреса
- Устраняет необходимость синхронизации `isDefault` при изменении выбранного адреса
- Упрощает логику - один источник правды вместо двух

---

### 2. **Схема Shop**

```typescript
@Prop({ type: Types.ObjectId, ref: Address.name, default: null })
address?: Types.ObjectId | null;
```

**Особенности:**
- У магазина может быть только один адрес
- Храним прямую ссылку на `Address`
- `null` если адрес не установлен

---

### 3. **Схема Customer**

```typescript
@Prop({ type: [Types.ObjectId], ref: Address.name, default: () => [] })
addresses: Types.ObjectId[];

@Prop({ type: Types.ObjectId, ref: Address.name, default: null })
selectedAddress: Types.ObjectId | null;

@Prop({ type: Number, min: 0, default: 0, required: true })
bonusPoints: number;
```

**Особенности:**
- `addresses` - массив всех адресов клиента
- `selectedAddress` - текущий выбранный адрес (ссылка на один из `addresses`)
- Добавлено поле `bonusPoints` для бонусной системы

---

## 🔧 Обновленные методы

### Customer.addAddress()

```typescript
async addAddress(command: AddAddressCommand): Promise<void> {
  // 1. Создаем адрес через AddressesPort
  const newAddress = await this.addressesPort.createAddress(createCommand);
  const addressObjectId = new Types.ObjectId(newAddress.addressId);

  // 2. Добавляем ObjectId в массив addresses
  customer.addresses.push(addressObjectId);

  // 3. Если первый адрес - устанавливаем как selectedAddress
  if (customer.addresses.length === 1) {
    customer.selectedAddress = addressObjectId;
  }

  await customer.save();
}
```

### Customer.deleteAddress()

```typescript
async deleteAddress(command: DeleteAddressCommand): Promise<void> {
  const wasSelected = customer.selectedAddress?.toString() === payload.addressId;

  // 1. Удаляем из массива addresses
  customer.addresses = customer.addresses.filter(
    addr => addr.toString() !== payload.addressId
  );

  // 2. Удаляем сам адрес
  await this.addressesPort.deleteAddress(payload.addressId);

  // 3. Если был выбранным - выбираем первый из оставшихся или null
  if (wasSelected) {
    customer.selectedAddress = customer.addresses.length > 0 
      ? customer.addresses[0] 
      : null;
  }

  await customer.save();
}
```

### Customer.selectAddress()

```typescript
async selectAddress(command: SelectAddressCommand): Promise<void> {
  const addressObjectId = new Types.ObjectId(payload.addressId);

  // 1. Проверяем, что адрес есть в массиве addresses
  const addressExists = customer.addresses.some(
    addr => addr.toString() === payload.addressId
  );
  if (!addressExists) {
    throw DomainError.notFound('Address', payload.addressId);
  }

  // 2. Устанавливаем selectedAddress
  customer.selectedAddress = addressObjectId;

  await customer.save();
}
```

---

## ❌ Удаленные элементы

### 1. **SetDefaultAddressCommand**
```typescript
// УДАЛЕНО - больше не нужно
export class SetDefaultAddressCommand {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly addressId: string,
  ) {}
}
```

### 2. **AddressesService.setDefaultAddress()**
```typescript
// УДАЛЕНО - заменено обновлением поля в схеме сущности
async setDefaultAddress(command: SetDefaultAddressCommand): Promise<void> {
  // ... старая логика с isDefault
}
```

### 3. **AddressesService.getDefaultAddress()**
```typescript
// УДАЛЕНО - используйте selectedAddress из схемы сущности
async getDefaultAddress(entityType: string, entityId: string): Promise<Address | null> {
  // ... старая логика поиска по isDefault
}
```

### 4. **Фильтр isDefault в GetEntityAddressesQuery**
```typescript
// УДАЛЕНО из фильтров
filters?: {
  isDefault?: boolean; // больше не существует
  label?: string;
  city?: string;
}
```

### 5. **Индекс isDefault**
```typescript
// УДАЛЕНО из схемы Address
AddressSchema.index({ entity: 1, isDefault: 1 });
```

---

## 📊 Миграция данных

### Для существующих Shop

```typescript
// Если у вас были магазины с addressId: string
// Обновите на address: ObjectId

// Пример миграции:
db.shops.find({ addressId: { $exists: true, $ne: null } }).forEach(shop => {
  db.shops.updateOne(
    { _id: shop._id },
    { 
      $set: { address: ObjectId(shop.addressId) },
      $unset: { addressId: 1 }
    }
  );
});
```

### Для существующих Customer

```typescript
// Миграция клиентов с selectedAddressId: string
// на addresses: ObjectId[] и selectedAddress: ObjectId

// Пример миграции:
db.customers.find({}).forEach(customer => {
  // Получаем все адреса клиента
  const customerAddresses = db.addresses.find({ 
    entityType: 'customer',
    entity: customer._id 
  }).toArray();

  const addressIds = customerAddresses.map(addr => addr._id);
  const selectedId = customerAddresses.find(addr => addr.isDefault)?._id || null;

  db.customers.updateOne(
    { _id: customer._id },
    {
      $set: {
        addresses: addressIds,
        selectedAddress: selectedId,
        bonusPoints: 0
      },
      $unset: { selectedAddressId: 1 }
    }
  );
});

// Удаляем поле isDefault из всех адресов
db.addresses.updateMany({}, { $unset: { isDefault: 1 } });
```

---

## 🎨 Примеры использования

### Shop - установка адреса

```typescript
// Создаем адрес для магазина
const addressCommand = new CreateAddressCommand(
  AddressEntityType.SHOP,
  shopId,
  {
    latitude: 55.7558,
    longitude: 37.6173,
    city: 'Москва',
    street: 'Тверская',
    house: '1',
  }
);

const address = await addressesPort.createAddress(addressCommand);

// Устанавливаем адрес магазину
await shopModel.updateOne(
  { _id: shopId },
  { $set: { address: new Types.ObjectId(address.addressId) } }
);
```

### Customer - работа с несколькими адресами

```typescript
// Добавление адреса (автоматически добавляется в addresses[])
await customerPort.addAddress(new AddAddressCommand(
  customerId,
  { latitude: 55.7558, longitude: 37.6173, ... }
));

// Выбор адреса из существующих
await customerPort.selectAddress(new SelectAddressCommand(
  customerId,
  { addressId: 'some-address-id' }
));

// Удаление адреса (автоматически убирается из addresses[])
await customerPort.deleteAddress(new DeleteAddressCommand(
  customerId,
  { addressId: 'some-address-id' }
));

// Получение выбранного адреса
const customer = await customerModel.findById(customerId);
if (customer.selectedAddress) {
  const address = await addressesPort.getAddress(
    customer.selectedAddress.toString()
  );
}
```

### Получение адресов с populate

```typescript
// Для Shop
const shop = await shopModel
  .findById(shopId)
  .populate('address')
  .exec();

console.log(shop.address); // Address document

// Для Customer
const customer = await customerModel
  .findById(customerId)
  .populate('addresses')
  .populate('selectedAddress')
  .exec();

console.log(customer.addresses); // Address[]
console.log(customer.selectedAddress); // Address
```

---

## ✅ Преимущества новой архитектуры

1. **Единый источник правды**
   - Выбранный адрес хранится только в схеме сущности
   - Нет необходимости синхронизировать `isDefault` между адресами

2. **Упрощенная логика**
   - Не нужно обновлять все адреса при смене выбранного
   - Операции стали атомарными

3. **Лучшая производительность**
   - Меньше операций обновления БД
   - Убран индекс на `isDefault`

4. **Более явная семантика**
   - `customer.selectedAddress` понятнее чем поиск адреса с `isDefault: true`
   - `shop.address` явно указывает на единственный адрес магазина

5. **Гибкость для расширения**
   - Легко добавить множество выбранных адресов (например, "дом", "работа")
   - Можно хранить историю выбранных адресов

---

## 🔍 Проверка корректности миграции

```typescript
// Проверка что у всех адресов нет isDefault
const addressesWithIsDefault = await db.addresses.countDocuments({ 
  isDefault: { $exists: true } 
});
console.log('Адресов с isDefault:', addressesWithIsDefault); // Должно быть 0

// Проверка что selectedAddress указывает на адрес из addresses
const customersWithInvalidSelected = await db.customers.find({
  selectedAddress: { $exists: true, $ne: null },
  $expr: { $not: { $in: ['$selectedAddress', '$addresses'] } }
}).count();
console.log('Клиентов с невалидным selectedAddress:', customersWithInvalidSelected); // Должно быть 0
```

---

## 📝 Обновленные файлы

### Инфраструктурный модуль addresses:
- ✅ `src/infra/addresses/address.schema.ts` - убрано `isDefault`, убран индекс
- ✅ `src/infra/addresses/addresses.commands.ts` - удален `SetDefaultAddressCommand`
- ✅ `src/infra/addresses/addresses.queries.ts` - убран фильтр `isDefault`
- ✅ `src/infra/addresses/addresses.service.ts` - удалены методы `setDefaultAddress` и `getDefaultAddress`

### Модуль shop:
- ✅ `src/modules/shop/shop.schema.ts` - заменено `addressId: string` на `address: ObjectId`

### Модуль customer:
- ✅ `src/modules/customer/customer.schema.ts` - добавлены `addresses: ObjectId[]`, `selectedAddress: ObjectId`, `bonusPoints: number`
- ✅ `src/modules/customer/customer.service.ts` - обновлены методы `addAddress`, `deleteAddress`, `selectAddress`

---

## 🚀 Результат

Модули `Shop` и `Customer` полностью интегрированы с обновленным модулем `addresses`. Управление выбранным адресом теперь происходит на уровне схемы сущности, что делает архитектуру более чистой и понятной.
