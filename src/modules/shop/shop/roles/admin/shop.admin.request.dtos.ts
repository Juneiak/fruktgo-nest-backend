import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { VerifiedStatus } from 'src/common/enums/common.enum';

export class UpdateShopDto {
  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;

  @IsEnum(VerifiedStatus)
  @IsOptional()
  verifiedStatus?: VerifiedStatus;

  @IsString()
  @IsOptional()
  internalNote?: string | null;
}
