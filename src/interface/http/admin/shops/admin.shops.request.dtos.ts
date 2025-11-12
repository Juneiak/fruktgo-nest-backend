import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { VerifiedStatus, BlockStatus } from 'src/common/enums/common.enum';

export class UpdateShopDto {
  @IsOptional()
  @IsEnum(VerifiedStatus)
  verifiedStatus?: VerifiedStatus;

  @IsOptional()
  @IsString()
  internalNote?: string | null;
}

export class BlockShopDto {
  @IsEnum(BlockStatus)
  status: BlockStatus;

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsOptional()
  @IsDateString()
  blockedUntil?: Date | null;
}
