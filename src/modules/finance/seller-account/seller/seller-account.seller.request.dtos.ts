import { IsOptional, IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { IsNumber } from 'class-validator';


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