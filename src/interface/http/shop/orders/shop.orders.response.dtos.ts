import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import {
  OrderStatus,
  OrderCancelReason,
  OrderDeclineReason,
  PositiveFeedbackTag,
  NegativeFeedbackTag
} from 'src/modules/order/order.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

class OrderedByDto {
  @Expose() customer: any;
  @Expose() customerName: string;
}
class ShopDto {
  @Expose() shopId: string;
  @Expose() shopOrdersCount: number;
  @Expose() avgRating: number;
  @Expose() ratingsCount: number;
}

class OrderedFromDto {
  @Expose() @Type(() => ShopDto) shop: ShopDto;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage: string;
}
class HandledByDto {
  @Expose() employee: any;
  @Expose() employeeName: string;
}

class OrderDeliveryInfoDto {
  @Expose() deliveryAddress: string;
  @Expose() deliveryPrice: number;
  @Expose() deliveryTime: number;
}

class OrderFinanceInfoDto {
  @Expose() totalCartSum: number;
  @Expose() sentSum: number;
  @Expose() deliveryPrice: number;
  @Expose() systemTax: number;
  @Expose() usedBonusPoints: number | null;
  @Expose() totalWeightCompensationBonus: number | null;
  @Expose() totalSum: number;
}

class OrderRatingDto {
  @Expose() settedRating: number;
  @Expose() feedbackAt: Date;
  @Expose() feedbackTags: (PositiveFeedbackTag | NegativeFeedbackTag)[];
  @Expose() feedbackComment: string;
}

class OrderProductResponseDto {
  @ExposeObjectId() shopProduct: any;
  @Expose() category: string;
  @Expose() productName: string;
  @Expose() price: number;
  @ExposeObjectId() cardImage: string;
  @Expose() measuringScale: string;
  @Expose() selectedQuantity: number;
  @Expose() actualQuantity: number | null;
  @Expose() weightCompensationBonus: number | null;
}

export class OrderPreviewResponseDto {
  @Expose() orderId: string;
  @Expose() @Type(() => OrderedByDto) orderedBy: OrderedByDto;
  @Expose() @Type(() => OrderedFromDto) orderedFrom: OrderedFromDto;
  @ExposeObjectId() shift: Types.ObjectId;
  @Expose() orderStatus: OrderStatus;
  @Expose() orderedAt: Date;
  @Expose() acceptedAt: Date | null;
  @Expose() assembledAt: Date | null;
  @Expose() handedToCourierAt: Date | null;
  @Expose() deliveredAt: Date | null;
  @Expose() canceledAt: Date | null;
  @Expose() canceledReason: OrderCancelReason | null;
  @Expose() canceledComment: string | null;
  @Expose() declinedAt: Date | null;
  @Expose() declinedReason: OrderDeclineReason | null;
  @Expose() declinedComment: string | null;
  @Expose() handledBy: HandledByDto | null;
  @Expose() @Type(() => OrderFinanceInfoDto) finances: OrderFinanceInfoDto;
  @Expose() @Type(() => OrderRatingDto) rating: OrderRatingDto | null;
}

export class OrderFullResponseDto {
  @Expose() orderId: string;
  @Expose() @Type(() => OrderedFromDto) orderedFrom: OrderedFromDto;
  @ExposeObjectId() shift: Types.ObjectId;
  @Expose() orderStatus: OrderStatus;
  @Expose() orderedAt: Date;
  @Expose() acceptedAt: Date | null;
  @Expose() assembledAt: Date | null;
  @Expose() handedToCourierAt: Date | null;
  @Expose() deliveredAt: Date | null;
  @Expose() canceledAt: Date | null;
  @Expose() canceledReason: OrderCancelReason | null;
  @Expose() canceledComment: string | null;
  @Expose() declinedAt: Date | null;
  @Expose() declinedReason: OrderDeclineReason | null;
  @Expose() declinedComment: string | null;
  @Expose() customerComment: string | null;
  @Expose() handledBy: HandledByDto | null;
  @Expose() @Type(() => OrderFinanceInfoDto) finances: OrderFinanceInfoDto;
  @Expose() @Type(() => OrderRatingDto) rating: OrderRatingDto | null;
  @Expose() @Type(() => OrderProductResponseDto) products: OrderProductResponseDto[];
}

export class ActiveOrderResponseDto {
  @Expose() orderId: string;
  @Expose() @Type(() => OrderedFromDto) orderedFrom: OrderedFromDto;
  @ExposeObjectId() shift: Types.ObjectId;
  @Expose() orderStatus: OrderStatus;
  @Expose() orderedAt: Date;
  @Expose() acceptedAt: Date | null;
  @Expose() assembledAt: Date | null;
  @Expose() handedToCourierAt: Date | null;
  @Expose() deliveredAt: Date | null;
  @Expose() canceledAt: Date | null;
  @Expose() canceledReason: OrderCancelReason | null;
  @Expose() canceledComment: string | null;
  @Expose() declinedAt: Date | null;
  @Expose() declinedReason: OrderDeclineReason | null;
  @Expose() declinedComment: string | null;
  @Expose() customerComment: string | null;
  @Expose() handledBy: HandledByDto | null;
  @Expose() @Type(() => OrderFinanceInfoDto) finances: OrderFinanceInfoDto;
  @Expose() @Type(() => OrderRatingDto) rating: OrderRatingDto | null;
}
