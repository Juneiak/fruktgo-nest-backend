import { VerifiedStatus } from 'src/common/enums/common.enum';
import { Expose, Type } from 'class-transformer';
import { OrderStatus } from 'src/modules/order/order.schema';
import { BlockStatus } from 'src/common/enums/common.enum';

class BlockedDto {
  @Expose() status: BlockStatus;
  @Expose() reason?: string | null;
  @Expose() code?: string | null;
  @Expose() by?: string | null;
  @Expose() blockedAt?: Date | null;
  @Expose() blockedUntil?: Date | null;
}

class AddresseDto {
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
  @Expose() blocked: BlockedDto;
  @Expose() selectedAddressId: AddresseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() telegramId: number;
  @Expose() phone?: string | null;
  @Expose() sex?: string | null;
  @Expose() birthDate?: Date | null;
  @Expose() bonusPoints: number;
  @Expose() @Type(() => AddresseDto) savedAddresses: AddresseDto[] | [];
  @Expose() @Type(() => OrderDto) activeOrders: OrderDto[] | [];
}

export class CustomerPreviewResponseDto {
  @Expose() blocked: BlockedDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() phone: string;
  @Expose() selectedAddressId: AddresseDto;
  @Expose() bonusPoints: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramId: number;
  @Expose() customerId: string;
}
