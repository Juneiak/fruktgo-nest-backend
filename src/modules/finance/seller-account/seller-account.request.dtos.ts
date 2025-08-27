
import { Expose, Type } from 'class-transformer';
import { IsOptional, IsString, IsDate, IsNotEmpty, IsEnum, ValidateNested } from 'class-validator';
import { Min, IsNumber } from 'class-validator';
import { WithdrawalRequestStatus } from './schemas/withdrawal-request.schema';

// ====================================================
// COMMON
// ====================================================
export enum WithdrawalRequestStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// query
export class WithdrawalRequestFilterQueryDto {
  @IsOptional()
  @IsEnum(WithdrawalRequestStatusFilter)
  status?: WithdrawalRequestStatusFilter;

  @IsOptional()
  @IsString()
  ofSellerId?: string;
}


// ====================================================
// FOR ADMIN
// ====================================================
export class UpdateWithdrawalRequestDto {
  @IsOptional()
  @IsEnum(WithdrawalRequestStatus)
  status?: WithdrawalRequestStatus;

  @IsOptional()
  @IsString()
  adminComment?: string;

  @IsOptional()
  @IsString()
  externalTransactionId?: string;

  @IsOptional()
  @IsDate()
  completedAt?: Date;
}


// ====================================================
// FOR SELLER
// ====================================================
export class UpdateBankDetailsDto {
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  bik: string;

  @IsString()
  @IsNotEmpty()
  correspondentAccount: string;

  @IsString()
  @IsNotEmpty()
  accountHolder: string;

  @IsString()
  @IsNotEmpty()
  inn: string;
}

export class CreateWithdrawalRequestDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}