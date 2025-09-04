import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

class OpenedByDto {
  @ExposeObjectId() employee: Types.ObjectId;
  @Expose() employeeName: string;
}

class ClosedByDto {
  @ExposeObjectId() employee: Types.ObjectId;
  @Expose() employeeName: string;
}

class StatisticsDto {
  @Expose() ordersCount: number;
}

class ShiftStatisticsDto {
  @Expose() ordersCount: number;
  @Expose() declinedOrdersCount: number;
  @Expose() declinedIncome: number;
  @Expose() totalIncome: number;
  @Expose() avgOrderPrice: number;
  @Expose() avgOrderAssemblyDuration: number;
  @Expose() avgOrderAcceptanceDuration: number;
  @Expose() topSellingProducts: string[];
}

export class ShiftPreviewResponseDto {
  @Expose() shiftId: string;
  @Expose() openedAt: Date;
  @Expose() closedAt: Date | null;
  @Expose() openedBy: OpenedByDto;
  @Expose() closedBy: ClosedByDto;
  @Expose() ordersCount: number;
  @Expose() @Type(() => StatisticsDto) statistics: StatisticsDto;
}

export class ShiftFullResponseDto {
  @Expose() shiftId: string;
  @Expose() shop: string | any;
  @Expose() openedAt: Date;
  @Expose() openComment: string | null;
  @Expose() closedAt: Date | null;
  @Expose() closeComment: string | null;
  @Expose() openedBy: OpenedByDto;
  @Expose() closedBy: ClosedByDto;
  @Expose() statistics: ShiftStatisticsDto;
}
