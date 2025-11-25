# Common Module

Общие утилиты, декораторы, guards и типы, используемые во всём проекте.

**Путь:** `src/common/`

---

## Структура

```
src/common/
├── index.ts              # Главный barrel export
├── constants/            # Константы
├── decorators/           # Декораторы NestJS
├── enums/                # Общие enum'ы
├── errors/               # DomainError система
├── filters/              # Exception filters
├── guards/               # Auth guards
├── interceptors/         # Interceptors
├── schemas/              # Общие Mongoose схемы
├── strategies/           # Passport strategies
├── transformers/         # Class-transformer трансформеры
├── types/                # TypeScript типы
├── utils/                # Утилитарные функции
└── validators.ts         # Кастомные валидаторы
```

---

## Decorators

### Param Decorators

**`GetUser()`** - Извлекает авторизованного пользователя из JWT

```typescript
@Get('profile')
getProfile(@GetUser() user: AuthenticatedUser) {
  // user = { id: string, type: UserType }
}
```

**`GetEmployee()`** - Извлекает сотрудника (используется с `EmployeeAuthGuard`)

```typescript
@UseGuards(JwtAuthGuard, EmployeeAuthGuard)
@Get('tasks')
getTasks(@GetEmployee() employee: AuthenticatedEmployee) {
  // employee = { id, employeeName, telegramId, employer, pinnedTo }
}
```

### Metadata Decorators

**`@UserType(...types)`** - Ограничивает доступ по типу пользователя

```typescript
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller', 'admin') // admin добавляется автоматически
@Get('shops')
getShops() {}
```

**`@Roles(...roles)`** - Ограничивает доступ по ролям

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform_admin', 'platform_support')
@Get('users')
getUsers() {}
```

**`@Public()`** - Помечает endpoint как публичный (без авторизации)

```typescript
@Public()
@Get('articles')
getPublicArticles() {}
```

### Validation Decorators

**`@AtLeastOneOf(fields)`** - Валидирует что хотя бы одно поле заполнено

```typescript
class FilterDto {
  @AtLeastOneOf(['customerId', 'phone', 'telegramId'])
  @IsOptional()
  customerId?: string;
  
  @IsOptional()
  phone?: string;
  
  @IsOptional()
  telegramId?: number;
}
```

### Transform Decorators

**`@ExposeObjectId()`** - Экспортирует ObjectId как string в Response DTO

```typescript
class OrderResponseDto {
  @ExposeObjectId()
  orderId: string;

  @ExposeObjectId()
  customerId: string;
}
```

---

## Enums

**`UserType`** - Типы пользователей
```typescript
enum UserType {
  SELLER = 'seller',
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SHOP = 'shop',
  EMPLOYEE = 'employee',
}
```

**`BlockStatus`** - Статусы блокировки
```typescript
enum BlockStatus {
  ACTIVE = 'active',      // нет ограничений
  BLOCKED = 'blocked',    // блокировка без срока
  SUSPENDED = 'suspended', // временная приостановка
}
```

**`VerifiedStatus`** - Статусы верификации
```typescript
enum VerifiedStatus {
  VERIFIED = 'verified',
  NOT_VERIFIED = 'notVerified',
  IS_CHECKING = 'isChecking',
}
```

**`UserSex`** - Пол пользователя
```typescript
enum UserSex {
  MALE = 'male',
  FEMALE = 'female',
  NOT_SPECIFIED = 'notSpecified',
}
```

---

## Errors

### DomainError

Единый класс для доменных ошибок с типизированными кодами.

```typescript
// Фабричные методы
throw DomainError.notFound('Customer', customerId);
throw DomainError.conflict('Телефон уже используется');
throw DomainError.forbidden('Доступ запрещён');
throw DomainError.validation('Некорректные данные', details);

// Прямое создание
throw new DomainError({
  code: DomainErrorCode.INVARIANT,
  message: 'Нельзя отменить завершённый заказ',
  meta: { orderId },
});
```

### handleServiceError

Преобразует доменные и БД ошибки в HTTP исключения.

```typescript
try {
  await this.orderPort.createOrder(command);
} catch (error) {
  handleServiceError(error, {
    [DomainErrorCode.NOT_FOUND]: new NotFoundException('Магазин не найден'),
    [DomainErrorCode.CONFLICT]: new ConflictException('Заказ уже существует'),
    [DomainErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Дубликат записи'),
  });
}
```

---

## Guards

**`JwtAuthGuard`** - Проверка JWT токена
**`TypeGuard`** - Проверка типа пользователя (работает с `@UserType`)
**`RolesGuard`** - Проверка ролей (работает с `@Roles`)
**`EmployeeAuthGuard`** - Проверка токена сотрудника (X-Employee-Token)

```typescript
// Стандартная комбинация для защищённых endpoints
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
@Controller('seller/shops')
export class SellerShopsController {}
```

---

## Types

### AuthenticatedUser
```typescript
interface AuthenticatedUser {
  id: string;
  type: UserType;
}
```

### AuthenticatedEmployee
```typescript
interface AuthenticatedEmployee {
  id: string;
  employeeName: string;
  telegramId: number;
  employer: string | null;
  pinnedTo: string | null;
}
```

### Command/Query Options
```typescript
interface CommonCommandOptions {
  session?: ClientSession;
}

interface CommonQueryOptions {
  session?: ClientSession;
}

interface CommonListQueryOptions<K extends string> {
  pagination?: PaginationOptions;
  sort?: Sortable<K>;
  session?: ClientSession;
}
```

### Utility Types
```typescript
// Требует хотя бы одно поле
type AtLeastOne<T> = {...};

// Требует ровно одно поле
type ExactlyOne<T> = {...};
```

---

## Utils

### assignField
Умное присваивание полей с обработкой null/undefined.

```typescript
// undefined - пропускается
assignField(seller, 'companyName', undefined); // ничего не делает

// null - удаляет поле (default)
assignField(seller, 'internalNote', null); // seller.internalNote = undefined

// null - сохраняет
assignField(customer, 'selectedAddressId', null, { onNull: 'keep' });
```

### checkId
Валидация массива ObjectId.

```typescript
checkId([customerId, shopId]); // throws DomainError.VALIDATION если невалидный
```

### generateAuthCode
Генерация 4-значного кода авторизации.

```typescript
const code = generateAuthCode(); // "0123"
```

### selectFields / excludeFields
Типобезопасный select для Mongoose.

```typescript
const shift = await shiftModel
  .findById(id)
  .select(selectFields<Shift>('shop', 'status', 'employee'))
  .exec();
```

### Form-data трансформеры
```typescript
transformDtoToFormDataNumber({ value })  // "123" → 123
transformDtoToFormDataString({ value })   // any → string
transformDtoToFormDataArray({ value })    // "['a']" → ['a']
```

---

## Schemas

### BlockedSchema
Вложенная схема для блокировки сущностей.

```typescript
const CustomerSchema = new Schema({
  blocked: BlockedSchema,
  // ...
});

const initBlocked: Blocked = { status: BlockStatus.ACTIVE };
```

### AddressSchema
Вложенная схема для адресов.

```typescript
const CustomerSchema = new Schema({
  addresses: [AddressSchema],
  // ...
});
```

---

## Constants

```typescript
// Допустимый недовес (90% от заказанного)
DEFAULT_MIN_WEIGHT_DIFFERENCE_PERCENTAGE = 0.9;

// Комиссия платформы (10%)
DEFAULT_SYSTEM_TAX = 0.1;

// Лимиты SLA (секунды)
DEFAULT_ACCEPTANCE_LIMIT = 180; // 3 мин на принятие
DEFAULT_ASSEMBLY_LIMIT = 300;   // 5 мин на сборку

// Коды авторизации (5 минут)
CUSTOMER_AUTH_CODE_EXPIRES_IN = 5 * 60 * 1000;
SELLER_AUTH_CODE_EXPIRES_IN = 5 * 60 * 1000;
// ...
```

---

## Validators

**`@IsValidPhoneNumber()`** - Валидация телефона через libphonenumber-js

```typescript
class AuthDto {
  @IsValidPhoneNumber({ message: 'Некорректный номер телефона' })
  phone: string;
}
```

---

## Transformers

**`@ToNumber()`** - Трансформация строки в число

```typescript
class UpdatePriceDto {
  @ToNumber()
  price: number;

  @ToInt()
  quantity: number;
}
```

---

## Interceptors

**`ImageUploadInterceptor(fieldName)`** - Обработка загрузки изображений

```typescript
@Post()
@UseInterceptors(ImageUploadInterceptor('image'))
create(
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: CreateDto,
) {}
```

Настройки:
- Разрешённые форматы: jpg, jpeg, png, webp
- Максимальный размер: 5 MB
- Storage: memory (для последующей обработки)

---

## Filters

**`MongooseExceptionFilter`** - Обработка ошибок Mongoose

```typescript
// main.ts
app.useGlobalFilters(new MongooseExceptionFilter());
```

**`DomainErrorFilter`** - Обработка DomainError

```typescript
// app.module.ts
providers: [
  { provide: APP_FILTER, useClass: DomainErrorFilter },
]
```

---

## Импорт

```typescript
// Централизованный импорт (рекомендуется)
import { 
  GetUser, 
  UserType, 
  DomainError, 
  JwtAuthGuard,
  AuthenticatedUser,
} from 'src/common';

// Или по категориям
import { GetUser, ExposeObjectId } from 'src/common/decorators';
import { DomainError, handleServiceError } from 'src/common/errors';
import { JwtAuthGuard, TypeGuard } from 'src/common/guards';
```
