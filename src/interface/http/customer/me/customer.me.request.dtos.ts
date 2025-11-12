import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDate } from 'class-validator';
import { UserSex } from 'src/common/enums/common.enum';

export class CreateAddressDto {
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  house: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  entrance?: string;

  @IsOptional()
  @IsString()
  intercomCode?: string;
}


export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEnum(UserSex)
  @IsOptional()
  sex?: UserSex;

  @IsDate()
  @IsOptional()
  birthDate?: Date | null;

  @IsString()
  @IsOptional()
  email?: string;
}