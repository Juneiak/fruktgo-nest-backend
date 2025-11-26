# Backend Coding Guidelines

> Практическое руководство по написанию кода. Для понимания архитектуры см. [architecture.md](./architecture.md).

## Содержание

- [1. Стек и конвенции](#1-стек-и-конвенции)
- [2. Паттерны модулей](#2-паттерны-модулей)
- [3. MongoDB Schema](#3-mongodb-schema)
- [4. HTTP Interface Layer](#4-http-interface-layer)
- [5. Error Handling](#5-error-handling)
- [6. Response DTOs](#6-response-dtos)
- [7. Best Practices](#7-best-practices)

---

## 1. Стек и конвенции

### Стек
- **NestJS** + TypeScript + MongoDB (Mongoose)
- **Luxon** для дат, **libphonenumber-js** для телефонов
- **Telegraf** для Telegram ботов
- **Jest** для тестов

### Именование

| Что | Стиль | Пример |
|-----|-------|--------|
| Классы, типы | PascalCase | `CustomerService` |
| Переменные, функции | camelCase | `getCustomer` |
| Файлы, папки | kebab-case | `customer.service.ts` |
| Env переменные | UPPERCASE | `DATABASE_URL` |
| Булевы переменные | is/has/can | `isLoading`, `hasError` |

### Файлы

**Domain модули:** `<module>.<type>.ts`
```
customer.service.ts, customer.port.ts, customer.commands.ts
```

**HTTP Interface:** `<role>.<resource>.<type>.ts`
```
admin.customers.controller.ts, customer.me.role.service.ts
```

### Функции

- **< 30 строк** для бизнес-логики, **< 20** для утилит
- Начинай с глагола: `getX`, `createX`, `isX`, `hasX`, `canX`
- Guard clauses вместо вложенных if
- RO-RO паттерн: объект на вход → объект на выход

---

## 2. Паттерны модулей

### Port + Service + Module

```typescript
// customer.port.ts
export interface CustomerPort {
  getCustomer(query: GetCustomerQuery): Promise<Customer | null>;
  createCustomer(command: CreateCustomerCommand): Promise<Customer>;
}
export const CUSTOMER_PORT = Symbol('CUSTOMER_PORT');

// customer.service.ts
@Injectable()
export class CustomerService implements CustomerPort {
  constructor(
    @InjectModel(Customer.name) private customerModel: CustomerModel,
    @Inject(ADDRESSES_PORT) private addressesPort: AddressesPort,
  ) {}
  // implementation...
}

// customer.module.ts
@Module({
  imports: [MongooseModule.forFeature([...]), AddressesModule],
  providers: [
    CustomerService,
    { provide: CUSTOMER_PORT, useExisting: CustomerService }
  ],
  exports: [CUSTOMER_PORT], // Экспортируй PORT, не Service
})
export class CustomerModule {}
```

### Commands & Queries

```typescript
// customer.commands.ts
export class CreateCustomerCommand {
  constructor(
    public readonly payload: {
      telegramId: number;
      customerName: string;
    }
  ) {}
}

export class UpdateCustomerCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: { customerName?: string }
  ) {}
}

// customer.queries.ts
export class GetCustomerQuery {
  constructor(
    public readonly filter: AtLeastOne<{
      customerId: string;
      telegramId: number;
    }>,
    public readonly options?: { select?: (keyof Customer)[] }
  ) {}
}
```

### Module Exports (namespace группировка)

```typescript
// index.ts
export { CustomerModule } from './customer.module';
export { Customer } from './customer.schema';
export { CustomerPort, CUSTOMER_PORT } from './customer.port';
export * as CustomerCommands from './customer.commands';
export * as CustomerQueries from './customer.queries';
export * as CustomerEnums from './customer.enums';

// Использование
import { CustomerCommands, CustomerQueries, CUSTOMER_PORT } from 'src/modules/customer';
const cmd = new CustomerCommands.CreateCustomerCommand({...});
```

---

## 3. MongoDB Schema

### Базовый шаблон

```typescript
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false  // Отключаем дефолтный virtual 'id'
})
export class Product {
  _id: Types.ObjectId;
  readonly productId: string; // Virtual
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true })
  owner: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.plugin(mongooseLeanVirtuals as any);
ProductSchema.plugin(mongoosePaginate);

ProductSchema.virtual('productId').get(function(this: Product) {
  return this._id.toString();
});

ProductSchema.index({ owner: 1, createdAt: -1 });

export type ProductDocument = HydratedDocument<Product>;
export type ProductModel = PaginateModel<ProductDocument>;
```

### Refs — через имя схемы

```typescript
// ✅ ПРАВИЛЬНО
@Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
pinnedTo: Types.ObjectId;

// ❌ НЕПРАВИЛЬНО — нет type-safety
@Prop({ type: Types.ObjectId, ref: 'Shop', required: true })
pinnedTo: Types.ObjectId;
```

### Embedded Documents — через @Schema класс

```typescript
// ✅ ПРАВИЛЬНО
@Schema({ _id: false })
export class EmployeeStatistics {
  @Prop({ type: Number, min: 0, default: 0 })
  totalOrders: number;

  @Prop({ type: Number, min: 0, default: 0 })
  totalShifts: number;
}
export const EmployeeStatisticsSchema = SchemaFactory.createForClass(EmployeeStatistics);

// Использование
@Prop({ type: EmployeeStatisticsSchema, required: true, default: () => ({}) })
statistics: EmployeeStatistics;

// ❌ НЕПРАВИЛЬНО — объект + interface
const statsSchema = { totalOrders: { type: Number } };
interface Stats { totalOrders: number; }
```

---

## 4. HTTP Interface Layer

### Controller — тонкий, делегирует в RoleService

```typescript
@ApiTags('customer')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class CustomerMeController {
  constructor(private readonly roleService: CustomerMeRoleService) {}

  @Get()
  getCustomer(@GetUser() user: AuthenticatedUser): Promise<CustomerResponseDto> {
    return this.roleService.getCustomer(user);
  }

  @Patch()
  updateCustomer(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateCustomerDto
  ): Promise<CustomerResponseDto> {
    return this.roleService.updateCustomer(user, dto);
  }
}
```

### RoleService — оркестрация + error handling

```typescript
@Injectable()
export class CustomerMeRoleService {
  constructor(
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
    @Inject(ACCESS_PORT) private readonly accessPort: AccessPort,
  ) {}

  async updateCustomer(user: AuthenticatedUser, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    try {
      // 1. DTO → Command
      const command = new CustomerCommands.UpdateCustomerCommand(user.id, {
        customerName: dto.customerName,
      });
      
      // 2. Вызов port
      await this.customerPort.updateCustomer(command);
      
      // 3. Return response
      return this.getCustomer(user);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Customer not found'),
        [DomainErrorCode.VALIDATION]: new BadRequestException('Validation error'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException(),
      });
    }
  }
}
```

### Access Control — через AccessPort

```typescript
async getOrder(user: AuthenticatedUser, orderId: string) {
  const hasAccess = await this.accessPort.canCustomerAccessOrder(user.id, orderId);
  if (!hasAccess) throw new ForbiddenException('No access');
  // ...
}
```

### Request DTOs

```typescript
export class UpdateCustomerDto {
  @IsString() @IsOptional()
  customerName?: string;

  @IsEnum(UserSex) @IsOptional()
  sex?: UserSex;

  @IsDate() @IsOptional()
  birthDate?: Date | null;
}
```

---

## 5. Error Handling

### Domain → HTTP маппинг

```typescript
// В service — бросаем DomainError
if (!customer) throw DomainError.notFound('Customer not found');
if (customer.blocked.status === BlockStatus.BLOCKED) {
  throw DomainError.forbidden('Customer is blocked');
}

// В RoleService — ловим и мапим в HTTP
try {
  await this.customerPort.updateCustomer(command);
} catch (error) {
  handleServiceError(error, {
    [DomainErrorCode.NOT_FOUND]: new NotFoundException('Not found'),
    [DomainErrorCode.VALIDATION]: new BadRequestException('Validation'),
    [DomainErrorCode.INVARIANT]: new ConflictException('Conflict'),
    [DomainErrorCode.FORBIDDEN]: new ForbiddenException('Forbidden'),
    [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Invalid ID'),
    [DomainErrorCode.OTHER]: new InternalServerErrorException(),
  });
}
```

---

## 6. Response DTOs

### Base Response паттерн

Базовые DTO в `src/interface/http/shared/base-responses/`:

```typescript
// base-responses/employee.base-response.ts
export interface IEmployeeResponse {
  employeeId: string;
  employeeName: Employee['employeeName']; // Привязка к схеме
  statistics: IEmployeeStatistics;
}

export class BaseEmployeeResponseDto implements IEmployeeResponse {
  @Expose() employeeId: string;
  @Expose() employeeName: string;
  @Expose() @Type(() => BaseEmployeeStatisticsDto) statistics: BaseEmployeeStatisticsDto;
}
```

### Роль-специфичные DTO — через PickType

```typescript
// admin/employees/admin.employees.response.dtos.ts
export class EmployeeFullResponseDto extends PickType(BaseEmployeeResponseDto, [
  'employeeId',
  'employeeName',
  'statistics',
  'createdAt',
] as const) {}

// Если нужно переопределить вложенный объект:
class _EmployeeBase extends PickType(BaseEmployeeResponseDto, ['employeeId', 'employeeName'] as const) {}

export class EmployeeResponseDto extends _EmployeeBase {
  @Expose() @Type(() => LimitedStatisticsDto) statistics: LimitedStatisticsDto;
}
```

### Вложенные DTO других сущностей

```typescript
// Вместо локального определения — PickType от базового DTO
class ShopDto extends PickType(BaseShopResponseDto, [
  'shopId', 'shopImage', 'shopName'
] as const) {}

class ShopProductDto extends PickType(BaseShopProductResponseDto, [
  'shopProductId', 'stockQuantity', 'status'
] as const) {
  @Expose() @Type(() => ShopDto) pinnedTo: ShopDto;
}
```

---

## 7. Best Practices

### ✅ DO

- Port interfaces для всех зависимостей модулей
- Classes для Commands/Queries (не interfaces)
- Namespace exports (`export * as CustomerCommands`)
- Virtual *Id поля в схемах
- `handleServiceError` в каждом методе RoleService
- `@Expose()` для Response DTOs
- `PickType` для роль-специфичных DTOs (не `OmitType`)
- `mongooseLeanVirtuals` плагин в каждой схеме

### ❌ DON'T

- Inject сервисы напрямую — используй Ports
- Бизнес-логика в Controllers/RoleServices
- DTOs как Commands/Queries
- Export Services — export Ports
- Тип `any`
- Refs через строку (`ref: 'Customer'`)
- Подсхемы через объект + interface
