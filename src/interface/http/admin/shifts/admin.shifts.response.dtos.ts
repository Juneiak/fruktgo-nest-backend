import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';


class OpenedByDto {
  @ExposeObjectId() employee: string;
  @Expose() employeeName: string;
}

class ClosedByDto {
  @ExposeObjectId() employee: string;
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
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() openedAt: Date;
  @Expose() openComment: string | null;
  @Expose() closedAt: Date | null;
  @Expose() closeComment: string | null;
  @Expose() @Type(() => OpenedByDto) openedBy: OpenedByDto;
  @Expose() @Type(() => ClosedByDto) closedBy: ClosedByDto | null;
  @Expose() @Type(() => ShiftStatisticsDto) statistics: ShiftStatisticsDto;
}