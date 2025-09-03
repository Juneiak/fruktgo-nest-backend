import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';

class OpenedByDto {
  @Expose() @Type(() => String) employee: Types.ObjectId;
  @Expose() employeeName: string;
}

class ClosedByDto {
  @Expose() @Type(() => String) employee: Types.ObjectId;
  @Expose() employeeName: string;
}

class ShopDto {
  @Expose() shopId: string;
  @Expose() shopName: string;
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

export class ShiftTelegramBotPreviewResponseDto {
  @Expose() shop: ShopDto;
  @Expose() shiftId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() openedAt: Date;
  @Expose() openComment: string | null;
  @Expose() openedBy: OpenedByDto;
  @Expose() closedBy: ClosedByDto;
  @Expose() statistics: ShiftStatisticsDto;
}