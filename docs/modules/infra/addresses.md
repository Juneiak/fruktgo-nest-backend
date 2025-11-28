# Addresses Infrastructure Module

Централизованное хранилище адресов, которое переиспользуется Customer, Shop и Employee контекстами. Поддерживает полиморфную связь через `refPath`, пагинацию и геопоиск.

## 1. Обзор

- единое место хранения адресов для разных ролей;
- оперирует только схемой `Address` и не зависит от доменных сервисов;
- предоставляет стандартные CRUD‑операции и выборку с пагинацией/геофильтрами;
- при работе с дефолтными адресами ответственность лежит на конкретной сущности (Shop/Customer обновляют собственные поля).

## 2. Схема данных

```typescript
@Schema({ timestamps: true, versionKey: false, id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } })
export class Address {
  @Prop({ type: String, required: true, enum: Object.values(AddressEntityType) })
  entityType: AddressEntityType; // customer | shop | employee

  @Prop({ type: Types.ObjectId, required: true, refPath: 'entityType' })
  entity: Types.ObjectId;

  @Prop({ type: Number, required: true }) latitude: number;
  @Prop({ type: Number, required: true }) longitude: number;
  @Prop({ type: String, required: true }) city: string;
  @Prop({ type: String, required: true }) street: string;
  @Prop({ type: String, required: true }) house: string;

  @Prop() apartment?: string;
  @Prop() floor?: string;
  @Prop() entrance?: string;
  @Prop() intercomCode?: string;
  @Prop() label?: string;
}

AddressSchema.index({ entityType: 1, entity: 1 });
AddressSchema.index({ latitude: 1, longitude: 1 });
```

`addressId` доступен через виртуал (`_id.toString()`).

## 3. Енумы

```typescript
export enum AddressEntityType {
  CUSTOMER = UserType.CUSTOMER,
  SHOP = UserType.SHOP,
  EMPLOYEE = UserType.EMPLOYEE,
}

export enum AddressLabel {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}
```

## 4. Commands

```typescript
new CreateAddressCommand(entityType, entityId, payload, addressId?);
new UpdateAddressCommand(addressId, payload);
new DeleteAllEntityAddressesCommand(entityType, entityId);
```

`payload` содержит обязательные координаты/город/улицу/дом и опциональные поля (квартира, подъезд и т.д.).

## 5. Queries

```typescript
new GetEntityAddressesQuery(entityType, entityId, { label?, city? });
new GetNearbyAddressesQuery(latitude, longitude, radiusKm, { entityType?, city? });
```

`getEntityAddresses` возвращает `PaginateResult<Address>` с сортировкой по `createdAt`. `getNearbyAddresses` использует `$geoWithin/$centerSphere`.

## 6. Port

```typescript
export interface AddressesPort {
  getAddress(addressId, queryOptions?): Promise<Address | null>;
  getEntityAddresses(query, options?): Promise<PaginateResult<Address>>;
  getNearbyAddresses(query, options?): Promise<PaginateResult<Address>>;

  createAddress(command, options?): Promise<Address>;
  updateAddress(command, options?): Promise<Address>;
  deleteAddress(addressId, options?): Promise<void>;
  deleteAllEntityAddresses(command, options?): Promise<void>;
}

export const ADDRESSES_PORT = Symbol('ADDRESSES_PORT');
```

## 7. Service

Ключевые детали `AddressesService`:

1. **Проверка ID.** Все методы вызывают `checkId`, чтобы избежать `CastError`.
2. **Сессии.** Поддерживают `commandOptions.session` и `queryOptions.session` для транзакций.
3. **Геопоиск.** Радиус переводится в радианы (`radiusKm / 6378.1`).
4. **Lean‑ответы.** `getAddress`, `getEntityAddresses`, `updateAddress` возвращают `lean({ virtuals: true })`.
5. **Валидация существования.** `updateAddress` и `deleteAddress` выбрасывают `DomainError.notFound`, если документ не найден.

## 8. Связи и использование

```typescript
@Injectable()
export class CustomerAddressesRoleService {
  constructor(@Inject(ADDRESSES_PORT) private readonly addressesPort: AddressesPort) {}

  async addAddress(customerId: string, dto: CreateCustomerAddressDto) {
    const address = await this.addressesPort.createAddress(
      new AddressesCommands.CreateAddressCommand(
        AddressEntityType.CUSTOMER,
        customerId,
        dto,
      ),
    );

    await this.customerPort.updateCustomer(new CustomerCommands.SetSelectedAddressCommand(customerId, address.addressId));
    return address;
  }
}
```

- Customer / Shop модули сами управляют полем «адрес по умолчанию» в своих схемах.
- Для каскадного удаления сущности вызывают `DeleteAllEntityAddressesCommand` внутри соответствующей транзакции.
- Геопоиск часто используется в подборе магазинов по адресу клиента.

