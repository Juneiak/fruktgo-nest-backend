import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDate, IsArray, IsEnum, Max, IsBoolean } from 'class-validator';
import { Expose, Exclude, Type } from 'class-transformer';
import { testSwaggerIds } from 'src/common/swagger';
import { Types } from 'mongoose';
import { OrderStatus, OrderCancelReason, OrderDeclineReason, PositiveFeedbackTag, NegativeFeedbackTag } from '../order.schema';


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
  shopImage: string;
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



export class OrderForShopPreviewResponseDto {
  @Expose()
  orderId: string;

  @Expose()
  @Type(() => OrderedByDto)
  orderedBy: OrderedByDto;

  @Expose()
  @Type(() => OrderedFromDto)
  orderedFrom: OrderedFromDto;

  @Expose()
  @Type(() => String)
  shift: Types.ObjectId;

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
  handledBy: HandledByDto | null;

  @Expose()
  @Type(() => OrderFinanceInfoDto)
  finances: OrderFinanceInfoDto;

  @Expose()
  @Type(() => OrderRatingDto)
  rating: OrderRatingDto | null;

}

export class OrderForShopFullResponseDto {
  @Expose()
  orderId: string;

  @Expose()
  @Type(() => OrderedFromDto)
  orderedFrom: OrderedFromDto;

  @Expose()
  @Type(() => String)
  shift: Types.ObjectId;

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
  @Type(() => OrderFinanceInfoDto)
  finances: OrderFinanceInfoDto;

  @Expose()
  @Type(() => OrderRatingDto)
  rating: OrderRatingDto | null;

  @Expose()
  @Type(() => OrderProductResponseDto)
  products: OrderProductResponseDto[];
}


export class ActiveOrderForShopResponseDto {
  @Expose()
  orderId: string;

  @Expose()
  @Type(() => OrderedFromDto)
  orderedFrom: OrderedFromDto;

  @Expose()
  @Type(() => String)
  shift: Types.ObjectId;

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
  @Type(() => OrderFinanceInfoDto)
  finances: OrderFinanceInfoDto;

  @Expose()
  @Type(() => OrderRatingDto)
  rating: OrderRatingDto | null;

}



// ====================================================
// ORDER
// ====================================================
export class DeclineOrderByEmployeeDto {
  @ApiProperty({ example: 'Примечание' })
  @IsString()
  @IsOptional()
  comment: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  declineAt: string;

  @ApiProperty({ example: 'Причина отклонения' })
  @IsString()
  @IsEnum(OrderDeclineReason)
  @IsNotEmpty()
  declineReason: OrderDeclineReason;
}


export class PrepareOrderProductByEmployeeDto {
  @ApiProperty({ example: testSwaggerIds.shopProductId, description: 'ID продукта магазина' })
  @IsNotEmpty()
  @IsString()
  shopProductId: string;

  @ApiProperty({ example: 100, description: 'Фактическое количество набранного товара' })
  @IsNotEmpty()
  @IsNumber()
  preparedQuantity: number;
}


export class CompleteOrderAssemblyByEmployeeDto {
  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  assemblyCompletedAt: string;

  @ApiProperty({ example: [testSwaggerIds.shopProductId] })
  @IsNotEmpty()
  @IsArray()
  assembledOrderProducts: OrderProductResponseDto[];
}

export class HandOrderToCourierByEmployeeDto {
  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  handedToCourierAt: string;
}
  