import { IsString, IsOptional, IsEnum, IsBoolean} from 'class-validator';
import { VerifiedStatus } from 'src/common/types';

export class UpdateEmployeeDto {
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