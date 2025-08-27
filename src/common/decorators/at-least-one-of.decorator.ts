import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function AtLeastOneOf(
  propertyNames: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'atLeastOneOf',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [propertyNames],
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          return propertyNames.some(field => !!obj[field]);
        },
        defaultMessage(args: ValidationArguments) {
          return `Должен быть указан хотя бы один из: ${propertyNames.join(', ')}`;
        },
      },
    });
  };
}