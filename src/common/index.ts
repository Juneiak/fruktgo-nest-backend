// ====================================================
// COMMON - Главный barrel export
// ====================================================

// Decorators
export {
  GetUser,
  GetEmployee,
  UserType as UserTypeDecorator, // Alias to avoid conflict with UserType enum
  Roles,
  Public,
  IS_PUBLIC_KEY,
  AtLeastOneOf,
  ExposeObjectId,
} from './decorators';

// Enums
export { BlockStatus, UserType, VerifiedStatus, UserSex } from './enums/common.enum';

// Errors
export * from './errors';

// Guards
export * from './guards';

// Types
export * from './types';
export * from './types/commands';
export * from './types/queries';
export * from './types/utility.types';

// Utils
export * from './utils';

// Schemas
export { BlockedSchema, Blocked, initBlocked, AddressSchema, Address } from './schemas/common-schemas';

// Constants
export * from './constants';

// Validators
export { IsValidPhoneNumber } from './validators';

// Transformers
export { ToNumber, ToNumberArray, ToInt } from './transformers/to-number.transformer';

// Interceptors
export { ImageUploadInterceptor } from './interceptors/image-upload.interceptor';

// Filters
export { MongooseExceptionFilter } from './filters/mongo-exception.filter';

// Strategies
export { JwtStrategy } from './strategies/jwt.strategy';
