import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

class ShiftStatisticsDto {
  @Expose() ordersCount: number;
  @Expose() deliveredOrdersCount: number;
  @Expose() canceledOrdersCount: number;
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
  @ExposeObjectId() shop: Types.ObjectId;
  @Expose() status: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() openedAt: Date;
  @Expose() closedAt: Date | null;
  @Expose() @Type(() => ShiftStatisticsDto) statistics: ShiftStatisticsDto;
  @Expose() events: any[];
}
