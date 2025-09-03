import { Expose } from 'class-transformer';
import { OrderStatus, OrderCancelReason, OrderDeclineReason, PositiveFeedbackTag, NegativeFeedbackTag } from '../order.schema';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class OrderedByDto {
  @Expose() customer: any;
  @Expose() customerName: string;
}

export class OrderedFromDto {
  @Expose() shop: any;
  @Expose() shopName: string;
  @Expose() shopImage: string;
}

export class HandledByDto {
  @Expose() @Type(() => String) employee: string;
  @Expose() employeeName: string;
}

export class OrderDeliveryInfoDto {
  @Expose() deliveryAddress: string;
  @Expose() deliveryPrice: number;
  @Expose() deliveryTime: number;
}

export class OrderFinanceInfoDto {
  @Expose() totalCartSum: number;
  @Expose() sentSum: number;
  @Expose() deliveryPrice: number;
  @Expose() systemTax: number;
  @Expose() usedBonusPoints: number | null;
  @Expose() totalWeightCompensationBonus: number | null;
  @Expose() totalSum: number;
}

export class OrderRatingDto {
  @Expose() settedRating: number;
  @Expose() feedbackAt: Date;
  @Expose() feedbackTags: (PositiveFeedbackTag | NegativeFeedbackTag)[];
  @Expose() feedbackComment: string;
}

export class OrderProductDto {
  @Expose() shopProduct: any;
  @Expose() category: string;
  @Expose() productName: string;
  @Expose() price: number;
  @Expose() @Type(() => String) cardImage: string;
  @Expose() measuringScale: string;
  @Expose() selectedQuantity: number;
  @Expose() actualQuantity: number | null;
  @Expose() weightCompensationBonus: number | null;
};

export class OrderFullResponseDto {
  @Expose() orderId: string;
  @Expose() @Type(() => String) shift: Types.ObjectId;
  @Expose() orderedFrom: OrderedFromDto;
  @Expose() orderStatus: OrderStatus;
  @Expose() orderedAt: Date;
  @Expose() acceptedAt: Date | null;
  @Expose() assembledAt: Date | null;
  @Expose() handedToCourierAt: Date | null;
  @Expose() courierCalledAt: Date | null;
  @Expose() deliveredAt: Date | null;
  @Expose() canceledAt: Date | null;
  @Expose() canceledReason: OrderCancelReason | null;
  @Expose() canceledComment: string | null;
  @Expose() declinedAt: Date | null;
  @Expose() declinedReason: OrderDeclineReason | null;
  @Expose() declinedComment: string | null;
  @Expose() customerComment: string | null;
  @Expose() @Type(() => HandledByDto) handledBy: HandledByDto | null;
  @Expose() @Type(() => OrderDeliveryInfoDto) delivery: OrderDeliveryInfoDto;
  @Expose() @Type(() => OrderFinanceInfoDto) finances: OrderFinanceInfoDto;
  @Expose() @Type(() => OrderRatingDto) rating: OrderRatingDto | null;
  @Expose() @Type(() => OrderProductDto) products: OrderProductDto[];
}

export class OrderPreviewResponseDto {
  @Expose() orderId: string;
  @Expose() orderStatus: OrderStatus;
  @Expose() @Type(() => String) shift: Types.ObjectId;
  @Expose() orderedAt: Date;
  @Expose() @Type(() => HandledByDto) handledBy: HandledByDto | null;
  @Expose() @Type(() => OrderFinanceInfoDto) finances: OrderFinanceInfoDto;
  @Expose() @Type(() => OrderRatingDto) rating: OrderRatingDto | null;
}
