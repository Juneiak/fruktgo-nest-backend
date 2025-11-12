import { IsString, IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { UserSex } from 'src/common/enums/common.enum';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  employeeName?: string;

  @IsEnum(UserSex)
  @IsOptional()
  sex?: UserSex;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  birthDate?: Date;
}
