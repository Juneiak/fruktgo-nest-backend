/**
 * Shop Shift Response DTOs
 *
 * Используем PickType от BaseShiftResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/shift.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  BaseShiftResponseDto,
  BaseShiftStatisticsDto,
  BaseShiftEventDto,
} from 'src/interface/http/shared/base-responses';

/**
 * Preview — для списков смен магазина
 */
class _ShiftPreviewBase extends PickType(BaseShiftResponseDto, [
  'shiftId',
  'shop',
  'status',
  'openedBy',
  'openedAt',
  'closedBy',
  'closedAt',
  'createdAt',
  'updatedAt',
] as const) {}

export class ShiftPreviewResponseDto extends _ShiftPreviewBase {
  @Expose() @Type(() => BaseShiftStatisticsDto) statistics: BaseShiftStatisticsDto;
  @Expose() @Type(() => BaseShiftEventDto) events: BaseShiftEventDto[];
}
