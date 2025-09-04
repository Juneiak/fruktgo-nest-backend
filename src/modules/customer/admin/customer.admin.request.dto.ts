import { IsString, IsNumber, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { VerifiedStatus } from 'src/common/types';
export class UpdateCustomerDto {
  @IsEnum(VerifiedStatus)
  @IsOptional()
  verifiedStatus?: VerifiedStatus;

  @IsNumber()
  @IsOptional()
  bonusPoints?: number;

  @IsString()
  @IsOptional()
  internalNote?: string;
}


export class NotifyCustomerDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNumber()
  @IsNotEmpty()
  telegramId: number;
}
