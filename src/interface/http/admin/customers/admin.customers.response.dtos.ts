/**
 * Admin Customer Response DTOs
 *
 * Используем PickType от BaseCustomerResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/customer.base-response
 */

import { PickType } from '@nestjs/swagger';
import { BaseCustomerResponseDto } from 'src/interface/http/shared/base-responses';

/**
 * Preview — для списков
 */
export class CustomerPreviewResponseDto extends PickType(BaseCustomerResponseDto, [
  'customerId',
  'customerName',
  'phone',
  'email',
  'telegramId',
  'telegramUsername',
  'telegramFirstName',
  'telegramLastName',
  'blocked',
  'verifiedStatus',
  'sex',
  'birthDate',
  'statistics',
  'bonusPoints',
  'lastLoginAt',
  'lastOrderAt',
  'internalNote',
  'createdAt',
  'updatedAt',
] as const) {}

/**
 * Full — все поля (admin видит всё)
 */
export class CustomerFullResponseDto extends PickType(BaseCustomerResponseDto, [
  'customerId',
  'customerName',
  'phone',
  'email',
  'telegramId',
  'telegramUsername',
  'telegramFirstName',
  'telegramLastName',
  'blocked',
  'verifiedStatus',
  'sex',
  'birthDate',
  'statistics',
  'bonusPoints',
  'lastLoginAt',
  'lastOrderAt',
  'savedAddresses',
  'selectedAddressId',
  'internalNote',
  'cart',
  'createdAt',
  'updatedAt',
] as const) {}
