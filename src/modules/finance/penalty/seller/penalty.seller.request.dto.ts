import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum PenaltyStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CREATED = 'created',
  CONFIRMED = 'confirmed',
  CONTESTED = 'contested',
  CANCELED = 'canceled',
  PROCESSED = 'processed',
}
export class PenaltyFilterQueryDto {
  @IsOptional()
  @IsEnum(PenaltyStatusFilter)
  status?: PenaltyStatusFilter;

  @IsOptional()
  @IsString()
  shopAccountId?: string;

  @IsOptional()
  @IsString()
  settlementPeriodId?: string;
}


export class ContestPenaltyDto {
  @IsString()
  @IsNotEmpty()
  consest: string;
}
  