import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';

export class AdminResponseDto {
  @IsNumber()
  @IsNotEmpty()
  telegramId: number;

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  telegramUsername: string;
}

export class SystemStatsToAdminResponseDto {
  @Expose()
  customersCount: number;

  @Expose()
  employeesCount: number;

  @Expose()
  sellersCount: number;

  @Expose()
  shopsCount: number;

  @Expose()
  ordersCount: number;
}

export class UserToVerifyToAdminResponseDto {
  @Expose()
  id: string;

  @Expose()
  telegramId: number;

  @Expose()
  telegramUsername: string;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;
  
  @Expose()
  type: string; // Тип пользователя: Клиент, Сотрудник, Продавец, Магазин

  @Expose()
  createdAt: Date;
}