import { Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';

export function ExposeObjectId(): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    Expose()(target, propertyKey);
    Transform(({ value }) => {
      if (value instanceof Types.ObjectId) return value.toString();
      if (typeof value === 'string') return value;
      return value ?? null;
    })(target, propertyKey);
  };
}