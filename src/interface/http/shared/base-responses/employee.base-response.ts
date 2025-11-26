/**
 * Employee Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают Pick<BaseEmployeeResponseDto, ...>
 *
 * @example
 * // В роль-файле:
 * export class EmployeeResponseDto extends PickType(BaseEmployeeResponseDto, [
 *   'employeeId', 'employeeName', 'statistics'
 * ]) {}
 */

import { Expose, Type } from 'class-transformer';
import { Employee, EmployeeStatistics } from 'src/modules/employee/employee.schema';
import { VerifiedStatus, UserSex } from 'src/common/enums/common.enum';
import { EmployeeStatus } from 'src/modules/employee/employee.enums';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { BlockedResponseDto } from '../shared.response.dtos';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

/**
 * Интерфейс статистики для Response
 * Роли могут делать Pick<IEmployeeStatistics, ...> для урезки полей
 */
export interface IEmployeeStatistics {
  totalOrders: EmployeeStatistics['totalOrders'];
  totalShifts: EmployeeStatistics['totalShifts'];
  shiftRating: EmployeeStatistics['shiftRating'];
}

export interface IEmployeeResponse {
  employeeId: string;
  employeeName: Employee['employeeName'];
  phone: Employee['phone'];
  employeeAvatar?: string;
  telegramId: Employee['telegramId'];
  telegramUsername?: Employee['telegramUsername'];
  telegramFirstName?: Employee['telegramFirstName'];
  telegramLastName?: Employee['telegramLastName'];
  blocked: BlockedResponseDto;
  verifiedStatus: Employee['verifiedStatus'];
  status: Employee['status'];
  sex: Employee['sex'];
  birthDate?: Employee['birthDate'];
  position?: Employee['position'];
  salary?: Employee['salary'];
  statistics: IEmployeeStatistics;
  lastLoginAt?: Employee['lastLoginAt'];
  pinnedTo?: string | null;
  employer?: string | null;
  openedShift?: string | null;
  sellerNote?: Employee['sellerNote'];
  internalNote?: Employee['internalNote'];
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

/**
 * Базовый DTO для статистики сотрудника
 * Роли могут выбрать нужные поля через OmitType/PickType
 */
export class BaseEmployeeStatisticsDto implements IEmployeeStatistics {
  @Expose() totalOrders: number;
  @Expose() totalShifts: number;
  @Expose() shiftRating: number;
}

/**
 * Базовый DTO сотрудника со всеми полями
 * Роли наследуют через PickType/OmitType
 */
export class BaseEmployeeResponseDto implements IEmployeeResponse {
  @Expose() employeeId: string;
  @Expose() employeeName: string;
  @Expose() phone: string;
  @ExposeObjectId() employeeAvatar?: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramFirstName?: string;
  @Expose() telegramLastName?: string;
  @Expose() @Type(() => BlockedResponseDto) blocked: BlockedResponseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() status: EmployeeStatus;
  @Expose() sex: UserSex;
  @Expose() birthDate?: Date;
  @Expose() position?: string;
  @Expose() salary?: string;
  @Expose() @Type(() => BaseEmployeeStatisticsDto) statistics: BaseEmployeeStatisticsDto;
  @Expose() lastLoginAt?: Date;
  @ExposeObjectId() pinnedTo?: string | null;
  @ExposeObjectId() employer?: string | null;
  @ExposeObjectId() openedShift?: string | null;
  @Expose() sellerNote?: string;
  @Expose() internalNote?: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
