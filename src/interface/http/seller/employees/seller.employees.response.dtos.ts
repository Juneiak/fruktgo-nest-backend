/**
 * Seller Employee Response DTOs
 *
 * Seller видит своих сотрудников (с sellerNote, без internalNote).
 * @see src/interface/http/shared/base-responses/employee.base-response
 */

import { PickType } from '@nestjs/swagger';
import { BaseEmployeeResponseDto } from 'src/interface/http/shared/base-responses';

/**
 * Seller view — с sellerNote, без internalNote
 */
export class EmployeeResponseDto extends PickType(BaseEmployeeResponseDto, [
  'employeeId',
  'employeeName',
  'phone',
  'employeeAvatar',
  'telegramId',
  'telegramUsername',
  'telegramFirstName',
  'telegramLastName',
  'blocked',
  'verifiedStatus',
  'status',
  'sex',
  'birthDate',
  'position',
  'salary',
  'statistics',
  'pinnedTo',
  'employer',
  'openedShift',
  'lastLoginAt',
  'sellerNote',
  'createdAt',
  'updatedAt',
] as const) {}