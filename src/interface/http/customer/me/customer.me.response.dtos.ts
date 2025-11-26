/**
 * Customer Me Response DTOs
 *
 * Используем PickType от BaseCustomerResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/customer.base-response
 */

import { PickType } from '@nestjs/swagger';
import { BaseCustomerResponseDto } from 'src/interface/http/shared/base-responses';

/**
 * Full — профиль клиента (без internalNote, cart)
 */
export class CustomerResponseDto extends PickType(BaseCustomerResponseDto, [
  'customerId',
  'customerName',
  'phone',
  'telegramId',
  'blocked',
  'verifiedStatus',
  'sex',
  'birthDate',
  'bonusPoints',
  'selectedAddressId',
] as const) {}

/**
 * Preview — краткая информация
 */
export class CustomerPreviewResponseDto extends PickType(BaseCustomerResponseDto, [
  'customerId',
  'customerName',
  'phone',
  'telegramId',
  'telegramUsername',
  'blocked',
  'verifiedStatus',
  'bonusPoints',
  'selectedAddressId',
] as const) {}
