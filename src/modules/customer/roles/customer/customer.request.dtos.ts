import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDate } from 'class-validator';
import { UserSex } from 'src/common/types';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsOptional()
  @IsString()
  house?: string;

  @IsOptional()
  @IsString()
  entrance?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  intercomCode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
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