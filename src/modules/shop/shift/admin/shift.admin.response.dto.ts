import { Expose, Type } from 'class-transformer';
import { OpenedBy, ClosedBy, Statistics } from '../../schemas/shift.schema';
import { OrderDeliveryInfoDto, OrderedByDto, OrderFinanceInfoDto, OrderRatingDto } from 'src/modules/order/order.dtos';
import { OrderStatus } from 'src/modules/order/order.schema';


export class ShiftPreviewResponseDto {
  @Expose() shiftId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() openedAt: Date;
  @Expose() openComment: string | null;
  @Expose() closedAt: Date | null;
  @Expose() closeComment: string | null;
  @Expose() openedBy: OpenedBy;
  @Expose() closedBy: ClosedBy | null;
  @Expose() statistics: Statistics;
}

class OrderDto {
  @Expose() orderId: string;
  @Expose() orderedBy: OrderedByDto;
  @Expose() orderStatus: OrderStatus;
  @Expose() orderedAt: Date;  
  @Expose() @Type(() => OrderDeliveryInfoDto) delivery: OrderDeliveryInfoDto;
  @Expose() @Type(() => OrderFinanceInfoDto) finances: OrderFinanceInfoDto;
  @Expose() @Type(() => OrderRatingDto) rating: OrderRatingDto | null;
};

export class ShiftFullResponseDto {
  @Expose() shiftId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() openedAt: Date;
  @Expose() openComment: string | null;
  @Expose() closedAt: Date | null;
  @Expose() closeComment: string | null;
  @Expose() openedBy: OpenedBy;
  @Expose() closedBy: ClosedBy | null;
  @Expose() statistics: Statistics;
  @Expose() @Type(() => OrderDto) orders: OrderDto[];
}