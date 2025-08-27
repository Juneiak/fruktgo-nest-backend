import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDate, IsBoolean } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { VerifiedStatus, UserSex } from 'src/common/types';
import { OrderStatus } from 'src/modules/order/order.schema';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsOptional()
  @IsString()
  house?: string;

  @IsOptional()
  @IsString()
  entrance?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  intercomCode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

}


export class AddressResponseDto {
  @Expose()
  id: string;

  @Expose()
  city: string;

  @Expose()
  street: string;

  @Expose()
  house?: string;

  @Expose()
  entrance?: string;

  @Expose()
  floor?: string;

  @Expose()
  apartment?: string;

  @Expose()
  intercomCode?: string;

  @Expose()
  address: string;

  @Expose()
  latitude?: number;

  @Expose()
  longitude?: number;

  @Expose()
  isSelected: boolean;
}


class OrderFinanceInfoDto {
  @Expose()
  sentSum: number;
}
class OrderDto {
  @Expose()
  orderId: string;

  @Expose()
  orderedAt: Date;

  @Expose()
  orderStatus: OrderStatus;

  @Expose()
  @Type(() => OrderFinanceInfoDto)
  finances: OrderFinanceInfoDto;
}


export class CustomerForCustomerResponseDto {
  @Expose()
  customerId: string;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  customerName: string;

  @Expose()
  telegramId: number;

  @Expose()
  phone?: string | null;

  @Expose()
  sex?: string | null;

  @Expose()
  birthDate?: Date | null;
  
  @Expose()
  bonusPoints: number;

  @Expose()
  @Type(() => AddressResponseDto)
  savedAddresses: AddressResponseDto[] | [];

  @Expose()
  @Type(() => OrderDto)
  activeOrders: OrderDto[] | [];
}

export class CustomerPreviewForTelegramBotResponseDto {
  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  customerName: string;

  @Expose()
  phone: string;

  @Expose()
  bonusPoints: number;

  @Expose()
  telegramUsername?: string;

  @Expose()
  telegramId: number;

  @Expose()
  customerId: string;
}


export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEnum(UserSex)
  @IsOptional()
  sex?: UserSex;

  @IsDate()
  @IsOptional()
  birthDate?: Date | null;

  @IsString()
  @IsOptional()
  email?: string;
}