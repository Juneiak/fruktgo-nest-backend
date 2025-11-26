/**
 * Admin Employee Response DTOs
 *
 * Используем PickType от BaseEmployeeResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/employee.base-response
 */

import { PickType } from '@nestjs/swagger';
import { BaseEmployeeResponseDto } from 'src/interface/http/shared/base-responses';

/**
 * Preview — без openedShift, sellerNote
 */
export class EmployeePreviewResponseDto extends PickType(BaseEmployeeResponseDto, [
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
  'lastLoginAt',
  'internalNote',
  'createdAt',
  'updatedAt',
] as const) {}

/**
 * Full — все поля (admin видит всё)
 */
export class EmployeeFullResponseDto extends PickType(BaseEmployeeResponseDto, [
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
  'internalNote',
  'sellerNote',
  'createdAt',
  'updatedAt',
] as const) {}