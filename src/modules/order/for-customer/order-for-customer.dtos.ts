import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsArray, IsEnum, Max } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { OrderStatus, OrderDeclineReason, OrderCancelReason, PositiveFeedbackTag, NegativeFeedbackTag } from '../order.schema';
import { Types } from 'mongoose';


export class RateTheOrderDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsNotEmpty()
  settedRating: number;

  @IsArray()
  @IsEnum([...Object.values(PositiveFeedbackTag), ...Object.values(NegativeFeedbackTag)], { each: true })
  @IsOptional()
  feedbackTags?: (PositiveFeedbackTag | NegativeFeedbackTag)[];
  
  @IsString()
  @IsOptional()
  feedbackComment?: string;
}


export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  cancelReason: OrderCancelReason;

  @IsString()
  @IsOptional()
  cancelComment?: string;

}


export class CartPreviewShopProductDto {
  @IsString()
  @IsNotEmpty()
  shopProductId: string;

  @IsNumber()
  @Min(1)
  selectedQuantity: number;

  
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  customerAddressId: string;
  
  @IsArray()
  @IsNotEmpty()
  @Type(() => CartPreviewShopProductDto)
  products: CartPreviewShopProductDto[];

  @IsNumber()
  @IsNotEmpty()
  expectedTotalPrice?: number;

  @IsNumber()
  @IsNotEmpty()
  expectedDeliveryPrice?: number;

  @IsNumber()
  @IsOptional()
  usedBonusPoints?: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class OrderCreatedResponseDto {
  @Expose()
  orderId: string
}


// ====================================================
// RESPONSES 
// ====================================================

class OrderedByDto {
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

class OrderedFromDto {
  @Expose()
  @Type(() => ShopDto)
  shop: ShopDto;

  @Expose()
  shopName: string;

  @Expose()
  @Type(() => String)
  shopImage: Types.ObjectId;
}

class HandledByDto {
  @Expose()
  employee: any;

  @Expose()
  employeeName: string;
}

class OrderDeliveryInfoDto {
  @Expose()
  deliveryAddress: string;

  @Expose()
  deliveryPrice: number;

  @Expose()
  deliveryTime: number;
}

class OrderFinanceInfoDto {
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

class OrderRatingDto {
  @Expose()
  settedRating: number;

  @Expose()
  feedbackAt: Date;

  @Expose()
  feedbackTags: (PositiveFeedbackTag | NegativeFeedbackTag)[];

  @Expose()
  feedbackComment: string;
}

class OrderProductResponseDto {
  @Expose()
  @Type(() => String)
  shopProduct: Types.ObjectId;

  @Expose()
  category: string;

  @Expose()
  productName: string;

  @Expose()
  price: number;

  @Expose()
  @Type(() => String)
  cardImage: Types.ObjectId;

  @Expose()
  measuringScale: string;

  @Expose()
  selectedQuantity: number;

  @Expose()
  actualQuantity: number | null;

  @Expose()
  weightCompensationBonus: number | null;
}

export class OrderForCustomerFullResponseDto {
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
  customerComment: string | null;

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
};


export class OrderForCustomerPreviewResponseDto {
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
  customerComment: string | null;

  @Expose()
  @Type(() => OrderFinanceInfoDto)
  finances: OrderFinanceInfoDto;

  @Expose()
  @Type(() => OrderRatingDto)
  rating: OrderRatingDto | null;


}

export class RateTheOrderResponseDto extends OrderRatingDto {}
