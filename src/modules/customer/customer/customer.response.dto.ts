import { VerifiedStatus } from 'src/common/types';
import { Expose, Type } from 'class-transformer';
import { OrderStatus } from 'src/modules/order/order.schema';


export class AddressResponseDto {
  @Expose() id: string;
  @Expose() city: string;
  @Expose() street: string;
  @Expose() house?: string;
  @Expose() entrance?: string;
  @Expose() floor?: string;
  @Expose() apartment?: string;
  @Expose() intercomCode?: string;
  @Expose() address: string;
  @Expose() latitude?: number;
  @Expose() longitude?: number;
  @Expose() isSelected: boolean;
}

class OrderFinanceInfoDto {
  @Expose() sentSum: number;
}
class OrderDto {
  @Expose() orderId: string;
  @Expose() orderedAt: Date;
  @Expose() orderStatus: OrderStatus;
  @Expose() @Type(() => OrderFinanceInfoDto) finances: OrderFinanceInfoDto;
}

export class CustomerResponseDto {
  @Expose() customerId: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() telegramId: number;
  @Expose() phone?: string | null;
  @Expose() sex?: string | null;
  @Expose() birthDate?: Date | null;
  @Expose() bonusPoints: number;
  @Expose() @Type(() => AddressResponseDto) savedAddresses: AddressResponseDto[] | [];
  @Expose() @Type(() => OrderDto) activeOrders: OrderDto[] | [];
}

export class CustomerPreviewResponseDto {
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() phone: string;
  @Expose() bonusPoints: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramId: number;
  @Expose() customerId: string;
}
