import { Expose, Type } from 'class-transformer';
import {VerifiedStatus} from 'src/common/types'


export class SellerFullResponseDto {
  @Expose()
  sellerId: string;

  @Expose()
  @Type(() => String)
  sellerLogo: string;

  @Expose()
  companyName: string;

  @Expose()
  inn: number;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  totalSales: number;

  @Expose()
  totalOrders: number;

  @Expose()
  lastLoginDate?: Date | null;

  @Expose()
  shopsCount: number;

  @Expose()
  employeesCount: number;

  @Expose()
  productsCount: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  lastLoginAt?: Date | null;

  @Expose()
  email: string;
  
  @Expose()
  phone: string | null;

  @Expose()
  telegramId: number;

  @Expose()
  telegramUsername?: string;

  @Expose()
  telegramFirstName?: string;

  @Expose()
  telegramLastName?: string;

}


