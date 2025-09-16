import { IsOptional, IsString, IsDate, IsEnum } from 'class-validator';
import { WithdrawalRequestStatus } from '../schemas/withdrawal-request.schema';


export enum WithdrawalRequestStatusFilter { 
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}


export class WithdrawalRequestFilterQueryDto {
  @IsOptional()
  @IsEnum(WithdrawalRequestStatusFilter)
  status?: WithdrawalRequestStatusFilter;

  @IsOptional()
  @IsString()
  ofSellerId?: string;
}


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
