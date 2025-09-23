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

export class ShiftResponseDto {
  @Expose() shiftId: string;
  @Expose() shop: string | any;
  @Expose() openedAt: Date;
  @Expose() openComment: string | null;
  @Expose() closedAt: Date | null;
  @Expose() closeComment: string | null;
  @Expose() @Type(() => OpenedByDto) openedBy: OpenedByDto;
  @Expose() @Type(() => ClosedByDto) closedBy: ClosedByDto;
  @Expose() @Type(() => ShiftStatisticsDto) statistics: ShiftStatisticsDto;
}
