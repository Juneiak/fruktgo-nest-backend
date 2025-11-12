# Addresses Module

Централизованный модуль для управления адресами с поддержкой полиморфных связей через `refPath`.

## 🏗️ Архитектура

### Схема с refPath

```typescript
@Schema({
  timestamps: true,
  versionKey: false,
  id: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Address {
  @Prop({ type: String, required: true, enum: Object.values(AddressEntityType) })
  entityType: AddressEntityType; // 'customer' | 'shop' | 'employee'

  @Prop({ 
    type: Types.ObjectId, 
    required: true,
    refPath: 'entityType' // 🔥 Динамическая ссылка на разные модели
  })
  entity: Types.ObjectId;
}
```

### Почему refPath?

1. **Полиморфизм** - один адрес может принадлежать разным типам сущностей
2. **Populate** - Mongoose автоматически найдет нужную модель для `.populate('entity')`
3. **Консистентность** - следует паттерну из `Issue` модуля
4. **Гибкость** - легко добавить новые типы сущностей

## 📦 Использование

### Customer Module

```typescript
// Добавление адреса клиенту
await this.addressesPort.createAddress(
  new AddressesCommands.CreateAddressCommand(
    AddressesEnums.AddressEntityType.CUSTOMER,
    customerId,
    {
      latitude: 55.7558,
      longitude: 37.6173,
      city: 'Москва',
      street: 'Тверская',
      house: '1',
      apartment: '10',
      floor: '3',
      entrance: '2',
      intercomCode: '1234',
    }
  )
);

// Получение всех адресов клиента
const addresses = await this.addressesPort.getEntityAddresses(
  new AddressesQueries.GetEntityAddressesQuery(
    AddressesEnums.AddressEntityType.CUSTOMER,
    customerId
  )
);

// Установка адреса по умолчанию
await this.addressesPort.setDefaultAddress(
  new AddressesCommands.SetDefaultAddressCommand(
    AddressesEnums.AddressEntityType.CUSTOMER,
    customerId,
    addressId
  )
);
```

### Shop Module

```typescript
// Создание адреса магазина
const addressCommand = new AddressesCommands.CreateAddressCommand(
  AddressesEnums.AddressEntityType.SHOP,
  shopId,
  {
    latitude: 55.7558,
    longitude: 37.6173,
    city: 'Москва',
    street: 'Арбат',
    house: '15',
  }
);
const createdAddress = await this.addressesPort.createAddress(addressCommand);

// Сохранение ссылки на адрес (через ObjectId)
shop.address = new Types.ObjectId(createdAddress.addressId);
await shop.save();
```

## 🔄 Миграция данных

Если в базе уже есть адреса с полем `entityId`, запустите миграцию:

```bash
node migrations/rename-address-entityId-to-entity.js
```

Миграция:
1. Переименует `entityId` → `entity`
2. Создаст необходимые индексы
3. Проверит количество измененных документов

## 📊 Индексы

Созданы следующие индексы для оптимизации:

```typescript
AddressSchema.index({ entityType: 1, entity: 1 });     // Поиск адресов сущности
AddressSchema.index({ latitude: 1, longitude: 1 });    // Геопоиск
```

## 🎯 Основные методы

### Queries
- `getAddress(addressId)` - получить адрес по ID
- `getEntityAddresses(query)` - получить все адреса сущности с пагинацией
- `getNearbyAddresses(query)` - геопоиск адресов в радиусе

### Commands
- `createAddress(command)` - создать новый адрес
- `updateAddress(command)` - обновить адрес
- `deleteAddress(addressId)` - удалить адрес
- `deleteAllEntityAddresses(command)` - удалить все адреса сущности

**Примечание:** Установка выбранного адреса теперь выполняется через обновление поля в схеме сущности (`shop.address` или `customer.selectedAddress`), а не через Address модуль.

## 🔗 Связи

### AddressEntityType

```typescript
export enum AddressEntityType {
  CUSTOMER = UserType.CUSTOMER,  // 'customer'
  SHOP = UserType.SHOP,          // 'shop'
  EMPLOYEE = UserType.EMPLOYEE,  // 'employee'
}
```

Значения совпадают с `UserType` для консистентности.

## 💡 Особенности

1. **Автоматический дефолтный адрес** - первый созданный адрес автоматически становится дефолтным
2. **Управление дефолтными адресами** - при установке нового дефолтного, старый автоматически сбрасывается
3. **Каскадное удаление** - при удалении дефолтного адреса, следующий становится дефолтным
4. **Виртуальное поле** - `addressId` автоматически генерируется из `_id`
5. **Транзакции** - все методы поддерживают Mongoose sessions

## 🚀 Преимущества новой архитектуры

- ✅ Централизованное хранение адресов
- ✅ Переиспользование между модулями
- ✅ Масштабируемость - легко добавить новые entity типы
- ✅ Геофункции готовы к использованию
- ✅ Следование стандартам проекта (Port/Facade/Service)
- ✅ Чистые схемы - Customer и Shop не содержат embedded адреса
- ✅ Полиморфные связи через refPath
