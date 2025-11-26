/**
 * Employee Me Response DTOs
 *
 * Сотрудник видит свой профиль (без sellerNote, internalNote).
 * Статистика урезана — только totalOrders, totalShifts.
 * @see src/interface/http/shared/base-responses/employee.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  BaseEmployeeResponseDto,
  BaseEmployeeStatisticsDto,
} from 'src/interface/http/shared/base-responses';

// ═══════════════════════════════════════════════════════════════
// STATISTICS (урезанная для сотрудника)
// ═══════════════════════════════════════════════════════════════

/**
 * Сотрудник видит только totalOrders и totalShifts (без shiftRating)
 */
class EmployeeStatisticsDto extends PickType(BaseEmployeeStatisticsDto, [
  'totalOrders',
  'totalShifts',
] as const) {}

// ═══════════════════════════════════════════════════════════════
// RESPONSE DTO
// ═══════════════════════════════════════════════════════════════

/**
 * Employee self-profile — без sellerNote, internalNote
 * statistics переопределён на урезанную версию
 */
class _EmployeeResponseBase extends PickType(BaseEmployeeResponseDto, [
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
  'pinnedTo',
  'employer',
  'openedShift',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
] as const) {}

export class EmployeeResponseDto extends _EmployeeResponseBase {
  @Type(() => EmployeeStatisticsDto)
  statistics: EmployeeStatisticsDto;
}
