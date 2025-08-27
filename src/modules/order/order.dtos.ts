import { Expose } from 'class-transformer';
import { testSwaggerIds } from 'src/common/swagger';
import { OrderStatus, OrderCancelReason, OrderDeclineReason, PositiveFeedbackTag, NegativeFeedbackTag } from './order.schema';
import { Type } from 'class-transformer';

export class OrderedByDto {
  @Expose()
  customer: any;

  @Expose()
  customerName: string;
}
class ShopDto {
  @Expose()
  shopId: string;

  @Expose()
  shopOrdersCount: number;

  @Expose()
  avgRating: number;

  @Expose()
  ratingsCount: number;
}

export class OrderedFromDto {
  @Expose()
  @Type(() => ShopDto)
  shop: ShopDto;

  @Expose()
  shopName: string;

  @Expose()
  shopImage: string;
}

export class HandledByDto {
  @Expose()
  employee: any;

  @Expose()
  employeeName: string;
}

export class OrderDeliveryInfoDto {
  @Expose()
  deliveryAddress: string;

  @Expose()
  deliveryPrice: number;

  @Expose()
  deliveryTime: number;
}

export class OrderFinanceInfoDto {
  @Expose()
  totalCartSum: number;

  @Expose()
  sentSum: number;

  @Expose()
  deliveryPrice: number;

  @Expose()
  systemTax: number;

  @Expose()
  usedBonusPoints: number | null;

  @Expose()
  totalWeightCompensationBonus: number | null;

  @Expose()
  totalSum: number;
}

export class OrderRatingDto {
  @Expose()
  settedRating: number;

  @Expose()
  feedbackAt: Date;

  @Expose()
  feedbackTags: (PositiveFeedbackTag | NegativeFeedbackTag)[];

  @Expose()
  feedbackComment: string;
}

export class OrderProductResponseDto {
  @Expose()
  @Type(() => String)
  shopProduct: any;

  @Expose()
  category: string;

  @Expose()
  productName: string;

  @Expose()
  price: number;

  @Expose()
  @Type(() => String)
  cardImage: string;

  @Expose()
  measuringScale: string;

  @Expose()
  selectedQuantity: number;

  @Expose()
  actualQuantity: number | null;

  @Expose()
  weightCompensationBonus: number | null;
}

export class OrderFullResponseDto {
  @Expose()
  orderId: string;

  @Expose()
  @Type(() => OrderedByDto)
  orderedBy: OrderedByDto;

  @Expose()
  @Type(() => OrderedFromDto)
  orderedFrom: OrderedFromDto;

  @Expose()
  orderStatus: OrderStatus;

  @Expose()
  orderedAt: Date;

  @Expose()
  acceptedAt: Date | null;

  @Expose()
  assembledAt: Date | null;

  @Expose()
  handedToCourierAt: Date | null;

  @Expose()
  deliveredAt: Date | null;

  @Expose()
  canceledAt: Date | null;

  @Expose()
  canceledReason: OrderCancelReason | null;

  @Expose()
  canceledComment: string | null;

  @Expose()
  declinedAt: Date | null;

  @Expose()
  declinedReason: OrderDeclineReason | null;

  @Expose()
  declinedComment: string | null;

  @Expose()
  customerComment: string | null;

  @Expose()
  handledBy: HandledByDto | null;

  @Expose()
  @Type(() => OrderDeliveryInfoDto)
  delivery: OrderDeliveryInfoDto;

  @Expose()
  @Type(() => OrderFinanceInfoDto)
  finances: OrderFinanceInfoDto;

  @Expose()
  @Type(() => OrderRatingDto)
  rating: OrderRatingDto | null;

  @Expose()
  @Type(() => OrderProductResponseDto)
  products: OrderProductResponseDto[];
}
