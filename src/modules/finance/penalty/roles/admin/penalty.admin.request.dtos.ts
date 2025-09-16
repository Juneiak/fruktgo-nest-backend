import { IsOptional, IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Min, IsNumber } from 'class-validator';
import { PenaltyReason, PenaltyStatus } from '../penalty.schema';


export class CreatePenaltyDto {
  @IsString()
  @IsNotEmpty()
  shopAccountId: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @IsEnum(PenaltyReason)
  @IsNotEmpty()
  reason: PenaltyReason;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(PenaltyStatus)
  @IsNotEmpty()
  status: PenaltyStatus;

  @IsString()
  @IsOptional()
  orderId?: string;
}

export class UpdatePenaltyDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsEnum(PenaltyReason)
  @IsOptional()
  reason?: PenaltyReason;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PenaltyStatus)
  @IsOptional()
  status?: PenaltyStatus;
}


export enum FinalizePenaltyStatus {
  CONFIRMED = PenaltyStatus.CONFIRMED,
  CANCELED = PenaltyStatus.CANCELED,
}
export class FinalizePenaltyDto {
  @IsEnum(FinalizePenaltyStatus)
  @IsNotEmpty()
  status: FinalizePenaltyStatus;

  @IsString()
  @IsOptional()
  answerToContest?: string;
}
