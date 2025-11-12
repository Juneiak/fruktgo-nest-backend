import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { VerifiedStatus, BlockStatus, UserSex } from 'src/common/enums/common.enum';

export class CustomerQueryDto {
  @IsEnum(VerifiedStatus, { each: true })
  @IsOptional()
  @Type(() => String)
  verifiedStatuses?: VerifiedStatus[];

  @IsEnum(BlockStatus, { each: true })
  @IsOptional()
  @Type(() => String)
  blockedStatuses?: BlockStatus[];

  @IsEnum(UserSex, { each: true })
  @IsOptional()
  @Type(() => String)
  sexes?: UserSex[];

  @IsDateString()
  @IsOptional()
  fromBirthDate?: Date;

  @IsDateString()
  @IsOptional()
  toBirthDate?: Date;
}
