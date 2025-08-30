import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateSellerDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(12)
  inn?: string;
}
