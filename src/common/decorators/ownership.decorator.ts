import { SetMetadata } from '@nestjs/common';

export interface OwnershipOptions {
  param: string;        // параметр URL, содержащий ID ресурса
  resource: string;     // название модели/коллекции ресурса
  field: string;        // поле в модели, которое должно соответствовать ID пользователя
  populate?: string[];  // массив путей для populate
}

export const OWNERSHIP_KEY = 'ownership';
export const RequireOwnership = (options: OwnershipOptions) => SetMetadata(OWNERSHIP_KEY, options);
  