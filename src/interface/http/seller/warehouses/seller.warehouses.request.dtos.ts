import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WarehouseStatus } from 'src/modules/warehouse';

// ═══════════════════════════════════════════════════════════════
// ADDRESS (соответствует формату Address из infra/addresses)
// ═══════════════════════════════════════════════════════════════

class WarehouseAddressDto {
  @ApiProperty()
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  longitude: number;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsString()
  house: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entrance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  intercomCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}

class WarehouseContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;
}

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

export class CreateWarehouseDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: WarehouseAddressDto })
  @ValidateNested()
  @Type(() => WarehouseAddressDto)
  address: WarehouseAddressDto;

  @ApiPropertyOptional({ type: WarehouseContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WarehouseContactDto)
  contact?: WarehouseContactDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

export class UpdateWarehouseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: WarehouseAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WarehouseAddressDto)
  address?: WarehouseAddressDto;

  @ApiPropertyOptional({ type: WarehouseContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WarehouseContactDto)
  contact?: WarehouseContactDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// ═══════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════

export class UpdateWarehouseStatusDto {
  @ApiProperty({ enum: WarehouseStatus })
  @IsEnum(WarehouseStatus)
  status: WarehouseStatus;
}

// ═══════════════════════════════════════════════════════════════
// WAREHOUSE PRODUCT
// ═══════════════════════════════════════════════════════════════

export class CreateWarehouseProductDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}

export class UpdateWarehouseProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}

export class AdjustStockDto {
  @ApiProperty({ description: 'Корректировка количества (+ или -)' })
  @IsNumber()
  adjustment: number;
}

export class SetStockDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;
}
