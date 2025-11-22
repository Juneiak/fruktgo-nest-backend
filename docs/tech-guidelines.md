# Backend Coding Guidelines (NestJS + TypeScript + MongoDB)

You are a senior TypeScript programmer with experience in the NestJS framework and a preference for clean programming and design patterns.

Generate code, corrections, and refactorings that comply with the basic principles, project stack and nomenclature.

## Project Stack (Context)

### Backend

- **Language**: TypeScript
- **Framework**: NestJS (HTTP + WebSocket/Socket.IO)
- **Database**: MongoDB (Mongoose)
- **Date & Time**: Luxon (`DateTime`, `Duration`, `Interval`)
- **Phone Numbers**: `libphonenumber-js`
- **Messaging / Bots**: Telegram bots with Telegraf (integrated with NestJS)
- **Testing**: Jest for unit and e2e tests (planned/used)
- **Containerization**: Docker / docker-compose for local dev and deployment
- **Configuration**: `.env` + NestJS `ConfigModule`

> These guidelines are primarily for the **backend (NestJS + TypeScript + MongoDB)**.

### Frontend (for context, not the scope of this document)

Client-facing:

- Web: Next.js, TypeScript, Zustand, TailwindCSS, zod, ReactHookForm
- Mobile: React Native (planned), TailwindCSS
- Web: React, TypeScript, Zustand, React Query, TailwindCSS, zod, ReactHookForm, ReactRouter

---

## Project Architecture

### Overview

This project follows **Port-Based Architecture** (Hexagonal Architecture / Ports & Adapters) combined with **CQRS pattern** for separation of read and write operations.

### Layer Structure

```
src/
├── modules/          # Domain modules (business logic)
├── infra/            # Infrastructure modules (reusable infrastructure)
├── interface/http/   # HTTP API layer (controllers, DTOs)
├── common/           # Shared utilities, types, guards, etc.
└── main.ts           # Application entry point
```

#### 1. Domain Layer (`src/modules/`)

Contains business logic organized by domain entities (customer, product, shop, etc.).

**Structure of each module:**
- `*.schema.ts` - MongoDB schema with Mongoose
- `*.service.ts` - Business logic implementation (implements Port)
- `*.port.ts` - Interface definition + DI Symbol
- `*.commands.ts` - Command classes (write operations)
- `*.queries.ts` - Query classes (read operations)
- `*.enums.ts` - Enums specific to the module
- `*.module.ts` - NestJS module definition
- `index.ts` - Module exports with namespace grouping

#### 2. Infrastructure Layer (`src/infra/`)

Reusable infrastructure modules (addresses, images, logs, notifications, etc.). Follows the same structure as domain modules.

#### 3. HTTP Interface Layer (`src/interface/http/`)

Organized by **user roles** (admin, customer, seller, employee, etc.).

**Structure:**
```
interface/http/
├── admin/
│   ├── customers/
│   │   ├── admin.customers.controller.ts
│   │   ├── admin.customers.request.dtos.ts
│   │   ├── admin.customers.response.dtos.ts
│   │   ├── admin.customers.role.service.ts
│   │   └── admin.customers.api.module.ts
│   └── admin.api.module.ts
├── customer/
│   ├── me/
│   ├── cart/
│   └── customer.api.module.ts
└── http.api.module.ts
```

**Each endpoint group contains:**
- `*.controller.ts` - NestJS controller with route handlers
- `*.request.dtos.ts` - Request DTOs with `class-validator` decorators
- `*.response.dtos.ts` - Response DTOs with `@Expose()` decorators
- `*.role.service.ts` - Role-specific orchestration service
- `*.api.module.ts` - API module definition

---

## TypeScript General Guidelines

### Basic Principles

- Use **English** for all code (names, comments, docs).
- Always declare the type of each variable and function (parameters and return value).
  - Avoid using `any`.
  - Create necessary types, interfaces, and type aliases.
- Use JSDoc to document public classes and methods (especially in shared/domain code).
- Don't leave blank lines within a function body.

### Nomenclature

- Use **PascalCase** for classes and types.
- Use **camelCase** for variables, functions, and methods.
- Use **kebab-case** for file and directory names.
- Use **UPPERCASE** for environment variables.
- Avoid magic numbers and define constants.
- Start each function name with a **verb**.
- Use verbs for boolean variables. Example: `isLoading`, `hasError`, `canDelete`, etc.
- Use complete words instead of abbreviations and correct spelling.
  - Except for standard abbreviations like `API`, `URL`, etc.
  - Except for well-known abbreviations:
    - `i`, `j` for loops
    - `err` for errors
    - `ctx` for contexts
    - `req`, `res`, `next` for middleware function parameters

### File Naming Conventions

**Domain/Infra modules:**
- Use module name as prefix: `customer.service.ts`, `customer.port.ts`, `customer.commands.ts`
- Pattern: `<module-name>.<type>.ts`

**HTTP Interface:**
- Use role prefix for files: `admin.customers.controller.ts`, `customer.me.controller.ts`
- Pattern: `<role>.<resource>.<type>.ts`

**Examples:**
- `src/modules/customer/customer.service.ts`
- `src/interface/http/admin/customers/admin.customers.controller.ts`
- `src/interface/http/customer/me/customer.me.role.service.ts`

### Functions

> In this context, “function” also applies to methods.

- Write short functions with a single purpose.
  - Aim for **< 30-50 instructions** for methods with business logic.
  - Aim for **< 20 instructions** for utility/helper functions.
  - Methods orchestrating multiple domain operations can be longer if they maintain single responsibility and clear structure.
- Name functions with a verb and something else.
  - If it returns a boolean, use `isX`, `hasX`, `canX`, etc.
  - If it doesn't return anything (side effects), use `executeX`, `handleX`, `saveX`, etc.
- Avoid deep nesting by:
  - Early checks and returns (guard clauses).
  - Extraction to utility/helper functions.
- Use higher-order functions (`map`, `filter`, `reduce`, etc.) to avoid manual loops when it improves readability.
  - Use arrow functions for simple functions (less than 3 instructions).
  - Use named functions for non-trivial logic.
- Use default parameter values instead of manual `null`/`undefined` checks where appropriate.
- Reduce function parameters using **RO-RO** (receive an object, return an object):
  - Use an object to pass multiple parameters.
  - Use an object to return multiple results.
  - Declare explicit types for input arguments and output.
- Keep a single level of abstraction inside a function (no mixing of low-level details and high-level orchestration).

### Data

- Don't abuse primitive types. Encapsulate data in composite/domain types where it helps.
- Avoid spreading validation logic across many functions.
  - Prefer classes/value objects with internal validation for complex data.
- Prefer immutability for data:
  - Use `readonly` for fields that don't change.
  - Use `as const` for literals that don't change.

### Classes

- Follow **SOLID** principles.
- Prefer **composition over inheritance**.
- Declare interfaces to define contracts (especially for services and repositories).
- Write small classes with a single purpose:
  - Less than ~200 instructions.
  - Less than 10 public methods.
  - Less than 10 properties.

### Exceptions

- Use exceptions to handle errors you do **not** expect as part of normal flow.
- If you catch an exception, it should be to:
  - Fix an expected problem.
  - Add context and rethrow.
- Otherwise, let the global NestJS exception filter handle it.

### Testing

- Follow the **Arrange-Act-Assert** convention for tests.
- Name test variables clearly:
  - Use: `inputX`, `mockX`, `actualX`, `expectedX`, etc.
- Write unit tests for each public function/method in services and domain logic.
  - Use test doubles (mocks, stubs, spies) to simulate dependencies.
    - Except for lightweight third-party dependencies that are cheap to execute.
- Write acceptance/e2e tests for each main API module.
  - Follow the **Given-When-Then** convention in test descriptions.

---

## NestJS Architecture Patterns

### Port-Based Architecture (Hexagonal Architecture)

**Port** - это интерфейс, определяющий контракт для модуля.

#### Port Definition

```typescript
// customer.port.ts
export interface CustomerPort {
  // QUERIES
  getCustomers(query: GetCustomersQuery, options?: CommonListQueryOptions): Promise<PaginateResult<Customer>>;
  getCustomer(query: GetCustomerQuery, options?: CommonQueryOptions): Promise<Customer | null>;
  
  // COMMANDS
  createCustomer(command: CreateCustomerCommand, options?: CommonCommandOptions): Promise<Customer>;
  updateCustomer(command: UpdateCustomerCommand, options?: CommonCommandOptions): Promise<void>;
}

export const CUSTOMER_PORT = Symbol('CUSTOMER_PORT');
```

**Ключевые моменты:**
- Port определяет публичный API модуля
- Разделение на QUERIES (чтение) и COMMANDS (изменение)
- Symbol используется для Dependency Injection
- Опциональные параметры `options` для session, pagination, etc.

#### Service Implementation

```typescript
// customer.service.ts
@Injectable()
export class CustomerService implements CustomerPort {
  constructor(
    @InjectModel(Customer.name) private customerModel: CustomerModel,
    @Inject(ADDRESSES_PORT) private addressesPort: AddressesPort,
  ) {}

  async getCustomer(query: GetCustomerQuery, options?: CommonQueryOptions): Promise<Customer | null> {
    // Implementation
  }
  
  async createCustomer(command: CreateCustomerCommand, options?: CommonCommandOptions): Promise<Customer> {
    // Implementation
  }
}
```

**Ключевые моменты:**
- Service реализует Port
- Используйте @Inject(PORT_SYMBOL) для зависимостей от других модулей
- Не используйте прямые импорты сервисов - только через Port

#### Module Setup

```typescript
// customer.module.ts
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }]),
    AddressesModule, // Import modules, not services
  ],
  providers: [
    CustomerService,
    { provide: CUSTOMER_PORT, useExisting: CustomerService }
  ],
  exports: [CUSTOMER_PORT], // Export Port, not Service
})
export class CustomerModule {}
```

**Ключевые моменты:**
- Экспортируйте PORT, а не Service
- Используйте `useExisting` для связывания Port с Service
- Импортируйте модули, а не сервисы

### CQRS Pattern

**Команды** (Commands) - операции изменения данных (write).
**Запросы** (Queries) - операции чтения данных (read).

#### Command Classes

```typescript
// customer.commands.ts
export class CreateCustomerCommand {
  constructor(
    public readonly payload: {
      telegramId: number;
      customerName: string;
      phone?: string;
    }
  ) {}
}

export class UpdateCustomerCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      customerName?: string;
      email?: string | null;
    }
  ) {}
}
```

**Ключевые моменты:**
- Команды - это классы (не интерфейсы)
- `readonly` для всех полей
- Payload содержит данные для операции
- ID сущности передается отдельно от payload

#### Query Classes

```typescript
// customer.queries.ts
export class GetCustomersQuery {
  constructor(
    public readonly filters?: {
      verifiedStatuses?: VerifiedStatus[];
      blockedStatuses?: BlockStatus[];
    },
    public readonly options?: {
      select?: (keyof Customer)[];
    }
  ) {}
}

export class GetCustomerQuery {
  constructor(
    public readonly filter: AtLeastOne<{
      customerId: string;
      telegramId: number;
      phone: string;
    }>,
    public readonly options?: {
      select?: (keyof Customer)[];
    }
  ) {}
}
```

**Ключевые моменты:**
- Запросы - это классы (не интерфейсы)
- `readonly` для всех полей
- `filters` для фильтрации данных
- `options` для дополнительных опций (select, sort, etc.)
- Типобезопасный `select` через `keyof`

### Module Exports Pattern

Каждый модуль экспортирует свои компоненты через `index.ts` с **namespace-группировкой**:

```typescript
// index.ts
export { CustomerModule } from './customer.module';
export { Customer } from './customer.schema';
export { CustomerPort, CUSTOMER_PORT } from './customer.port';
export * as CustomerCommands from './customer.commands';
export * as CustomerQueries from './customer.queries';
export * as CustomerEnums from './customer.enums'; // if exists
```

**Использование:**

```typescript
import {
  CustomerPort,
  CUSTOMER_PORT,
  CustomerCommands,
  CustomerQueries
} from 'src/modules/customer';

// Usage
const command = new CustomerCommands.CreateCustomerCommand({...});
const query = new CustomerQueries.GetCustomerQuery({...});
```

**Преимущества:**
- Чистые импорты без wildcard
- Группировка связанных классов
- Избежание конфликтов имен

---

## MongoDB Schema Patterns

### Schema Definition

```typescript
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false
})
export class Product {
  readonly productId: string; // Virtual field
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: Number, min: 1, required: true })
  price: number;

  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true })
  owner: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Plugins
ProductSchema.plugin(mongooseLeanVirtuals as any);
ProductSchema.plugin(mongoosePaginate);

// Virtual ID field
ProductSchema.virtual('productId').get(function (this: Product) {
  return this._id.toString();
});

// Indexes
ProductSchema.index({ owner: 1, createdAt: -1 });

// Types
export type ProductDocument = HydratedDocument<Product>;
export type ProductModel = PaginateModel<ProductDocument>;
```

**Ключевые моменты:**
- `timestamps: true` - автоматические createdAt/updatedAt
- `id: false` - отключаем дефолтное виртуальное поле `id`
- Создаем кастомное виртуальное поле с суффиксом Id (`productId`, `customerId`)
- Всегда добавляйте `mongooseLeanVirtuals` плагин
- Используйте `mongoosePaginate` для пагинации
- Определяйте типы: `Document`, `Model` с правильными generic-параметрами
- Добавляйте индексы для часто используемых запросов

### Embedded Documents

```typescript
const addressSchema = {
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  city: { type: String, required: true },
  _id: false // No _id for embedded documents
};

interface Address {
  latitude: number;
  longitude: number;
  city: string;
}

@Prop({ type: addressSchema })
address: Address;
```

---

## HTTP Interface Layer

### Controller Pattern

```typescript
@ApiTags('for customer')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class CustomerMeController {
  constructor(
    private readonly customerMeRoleService: CustomerMeRoleService,
  ) {}

  @ApiOperation({ summary: 'Get customer profile' })
  @Get()
  getCustomer(
    @GetUser() authedCustomer: AuthenticatedUser
  ): Promise<CustomerResponseDto> {
    return this.customerMeRoleService.getCustomer(authedCustomer);
  }

  @ApiOperation({ summary: 'Update customer profile' })
  @Patch()
  updateCustomer(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Body() dto: UpdateCustomerDto
  ): Promise<CustomerResponseDto> {
    return this.customerMeRoleService.updateCustomer(authedCustomer, dto);
  }
}
```

**Ключевые моменты:**
- Controller делегирует всю логику в RoleService
- Используйте `@GetUser()` для получения аутентифицированного пользователя
- Добавляйте Swagger декораторы (`@ApiOperation`, `@ApiTags`, `@ApiBearerAuth`)
- Guards на уровне класса, если применимы ко всем методам

### Role Service Pattern

```typescript
@Injectable()
export class CustomerMeRoleService {
  constructor(
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async updateCustomer(
    authedCustomer: AuthenticatedUser,
    dto: UpdateCustomerDto
  ): Promise<CustomerResponseDto> {
    try {
      // 1. Transform DTO to Command
      const command = new CustomerCommands.UpdateCustomerCommand(
        authedCustomer.id,
        {
          customerName: dto.customerName,
          email: dto.email,
        }
      );
      
      // 2. Execute command
      await this.customerPort.updateCustomer(command);
      
      // 3. Emit events if needed
      this.eventEmitter.emit(
        LogsEvents.LOG_EVENTS.CREATED,
        new LogsCommands.CreateLogCommand({...})
      );
      
      // 4. Return response
      return this.getCustomer(authedCustomer);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Customer not found'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Validation error'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Internal server error'),
      });
    }
  }
}
```

**Ключевые моменты:**
- RoleService координирует вызовы к domain ports
- Преобразует DTOs в Commands/Queries
- Обрабатывает ошибки и маппит их в HTTP exceptions
- Инициирует события через EventEmitter
- Не содержит бизнес-логики - только оркестрация

### Request DTOs

```typescript
export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEnum(UserSex)
  @IsOptional()
  sex?: UserSex;

  @IsDate()
  @IsOptional()
  birthDate?: Date | null;

  @IsString()
  @IsOptional()
  email?: string;
}
```

**Ключевые моменты:**
- Используйте `class-validator` декораторы
- `@IsOptional()` для необязательных полей
- Поля должны быть публичными (не readonly)

### Response DTOs

```typescript
export class CustomerResponseDto {
  @Expose() customerId: string;
  @Expose() customerName: string;
  @Expose() phone?: string | null;
  @Expose() email?: string | null;
  @Expose() bonusPoints: number;
}
```

**Трансформация:**

```typescript
return plainToInstance(CustomerResponseDto, customer, { 
  excludeExtraneousValues: true 
});
```

**Ключевые моменты:**
- Используйте `@Expose()` для всех полей, которые должны попасть в ответ
- `plainToInstance` с `excludeExtraneousValues: true` для безопасности
- Response DTO определяет контракт API

---

## Error Handling

### Domain Errors

```typescript
// Throwing domain errors in service
if (!customer) {
  throw DomainError.notFound('Customer not found');
}

if (customer.blocked.status === BlockStatus.BLOCKED) {
  throw DomainError.forbidden('Customer is blocked');
}
```

### HTTP Error Mapping

```typescript
try {
  await this.customerPort.updateCustomer(command);
} catch (error) {
  handleServiceError(error, {
    [DomainErrorCode.NOT_FOUND]: new NotFoundException('Customer not found'),
    [DomainErrorCode.FORBIDDEN]: new ForbiddenException('Action not allowed'),
    [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Validation error'),
    [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Invalid ID format'),
    [DomainErrorCode.OTHER]: new InternalServerErrorException('Internal server error'),
  });
}
```

**Ключевые моменты:**
- Domain layer выбрасывает `DomainError`
- HTTP layer мапит их в NestJS HTTP exceptions через `handleServiceError`
- Всегда обрабатывайте `OTHER` для неожиданных ошибок

---

## Best Practices Summary

### DO:
- ✅ Use Port interfaces for all module dependencies
- ✅ Separate Commands (write) and Queries (read)
- ✅ Use classes for Commands and Queries (not interfaces)
- ✅ Export modules with namespace grouping
- ✅ Use virtual fields for ID (*Id suffix)
- ✅ Add indexes to frequently queried fields
- ✅ Use RoleService for orchestration in HTTP layer
- ✅ Transform DTOs to Commands/Queries before calling ports
- ✅ Use @Expose() for Response DTOs
- ✅ Handle errors with handleServiceError in HTTP layer

### DON'T:
- ❌ Don't inject services directly - use Ports
- ❌ Don't mix business logic in Controllers or RoleServices
- ❌ Don't use DTOs as Commands/Queries
- ❌ Don't export Services - export Ports
- ❌ Don't use `any` type
- ❌ Don't leave error handling without mapping
- ❌ Don't forget to add mongooseLeanVirtuals plugin
