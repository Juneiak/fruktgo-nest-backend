import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsArray, IsEnum, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  OrderCancelReason,
  PositiveFeedbackTag,
  NegativeFeedbackTag
} from '../../order.schema';


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