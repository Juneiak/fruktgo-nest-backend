# Addresses Module

> `src/infra/addresses/`

Централизованное хранилище адресов с полиморфной связью через `refPath`. Поддерживает Customer, Shop, Employee, Warehouse.

## Структура

```
src/infra/addresses/
├── index.ts
├── address.schema.ts
├── addresses.enums.ts
├── addresses.commands.ts
├── addresses.queries.ts
├── addresses.port.ts
├── addresses.service.ts
└── addresses.module.ts
```

## Импорт

```typescript
import {
  AddressesPort,
  ADDRESSES_PORT,
  AddressesCommands,
  AddressesQueries,
  AddressesEnums,
  Address,
} from 'src/infra/addresses';

@Inject(ADDRESSES_PORT) private readonly addressesPort: AddressesPort
```

## Схема

```typescript
class Address {
  entityType: AddressEntityType;  // 'customer' | 'shop' | 'employee' | 'Warehouse'
  entity: Types.ObjectId;         // refPath → entityType
  
  latitude: number;
  longitude: number;
  city: string;
  street: string;
  house: string;
  
  apartment?: string;
  floor?: string;
  entrance?: string;
  intercomCode?: string;
  label?: string;  // home | work | other
}
```

## Енумы

```typescript
enum AddressEntityType {
  CUSTOMER = 'customer',
  SHOP = 'shop',
  EMPLOYEE = 'employee',
  WAREHOUSE = 'Warehouse',
}

enum AddressLabel {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}
```

## API

### Queries

| Метод | Описание |
|-------|----------|
| `getAddress(addressId)` | Получить адрес по ID |
| `getEntityAddresses(query)` | Все адреса сущности (paginated) |
| `getNearbyAddresses(query)` | Геопоиск в радиусе |

### Commands

| Метод | Описание |
|-------|----------|
| `createAddress(command)` | Создать адрес |
| `updateAddress(command)` | Обновить адрес |
| `deleteAddress(addressId)` | Удалить адрес |
| `deleteAllEntityAddresses(command)` | Удалить все адреса сущности |

## Использование

### Создание адреса

```typescript
const address = await this.addressesPort.createAddress(
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
    }
  )
);
```

### Получение адресов

```typescript
const result = await this.addressesPort.getEntityAddresses(
  new AddressesQueries.GetEntityAddressesQuery(
    AddressesEnums.AddressEntityType.CUSTOMER,
    customerId,
    { label: AddressesEnums.AddressLabel.HOME }
  ),
  { pagination: { page: 1, pageSize: 10 } }
);
```

### Геопоиск

```typescript
const nearby = await this.addressesPort.getNearbyAddresses(
  new AddressesQueries.GetNearbyAddressesQuery(
    55.7558, // latitude
    37.6173, // longitude
    5,       // radiusKm
    { entityType: AddressesEnums.AddressEntityType.SHOP }
  )
);
```

### Каскадное удаление

```typescript
await this.addressesPort.deleteAllEntityAddresses(
  new AddressesCommands.DeleteAllEntityAddressesCommand(
    AddressesEnums.AddressEntityType.CUSTOMER,
    customerId
  ),
  { session }
);
```

## Особенности

### Выбранный адрес
Управление «адресом по умолчанию» находится в схеме сущности:
- `Customer.selectedAddress` → ObjectId
- `Shop.address` → ObjectId

### Индексы

```typescript
AddressSchema.index({ entityType: 1, entity: 1 });  // Поиск по сущности
AddressSchema.index({ latitude: 1, longitude: 1 }); // Геопоиск
```

### Виртуалы

```typescript
AddressSchema.virtual('addressId').get(function() {
  return this._id?.toString();
});
```

## Best Practices

```typescript
// ✅ Создание с транзакцией
const address = await addressesPort.createAddress(command, { session });

// ✅ Каскадное удаление при удалении сущности
await addressesPort.deleteAllEntityAddresses(
  new AddressesCommands.DeleteAllEntityAddressesCommand(entityType, entityId),
  { session }
);

// ✅ Обновление выбранного адреса в сущности после создания
await customerPort.updateCustomer(
  new CustomerCommands.SetSelectedAddressCommand(customerId, address.addressId)
);
```
