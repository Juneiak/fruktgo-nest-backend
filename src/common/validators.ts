import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function(object: any, propertyName: string) {
    registerDecorator({
      name: 'isValidPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          try {
            // Проверяем валидность номера с помощью libphonenumber-js
            return isValidPhoneNumber(value);
          } catch (err) {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} должен быть действительным номером телефона`;
        }
      }
    });
  };
}