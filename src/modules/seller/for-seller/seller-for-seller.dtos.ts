import { Exclude, Expose, Type } from 'class-transformer';
import { IsString, IsNumber, Min, IsOptional, MinLength, MaxLength } from 'class-validator';
import {SellerFullResponseDto} from '../seller.dtos';
import { VerifiedStatus } from 'src/common/types';

export class SellerForSellerPreviewResponseDto {
  @Expose()
  sellerId: string;

  @Expose()
  @Type(() => String)
  sellerLogo: string;

  @Expose()
  companyName: string;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  lastLoginDate?: Date | null;
  
  @Expose()
  phone: string | null;

  @Expose()
  telegramId: number;
}


export class SellerForSellerFullResponseDto {
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



export class UpdateSellerForSellerDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(12)
  inn?: string;
}
