import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators';
import { WarehouseStatus } from 'src/modules/warehouse';
import { WarehouseProductStatus } from 'src/modules/warehouse-product';

// ═══════════════════════════════════════════════════════════════
// ADDRESS (формат Address из infra/addresses)
// ═══════════════════════════════════════════════════════════════

class WarehouseAddressResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  addressId: string;

  @ApiProperty()
  @Expose()
  latitude: number;

  @ApiProperty()
  @Expose()
  longitude: number;

  @ApiProperty()
  @Expose()
  city: string;

  @ApiProperty()
  @Expose()
  street: string;

  @ApiProperty()
  @Expose()
  house: string;

  @ApiPropertyOptional()
  @Expose()
  apartment?: string;

  @ApiPropertyOptional()
  @Expose()
  floor?: string;

  @ApiPropertyOptional()
  @Expose()
  entrance?: string;

  @ApiPropertyOptional()
  @Expose()
  intercomCode?: string;

  @ApiPropertyOptional()
  @Expose()
  label?: string;
}

class WarehouseContactResponseDto {
  @ApiPropertyOptional()
  @Expose()
  phone?: string;

  @ApiPropertyOptional()
  @Expose()
  email?: string;

  @ApiPropertyOptional()
  @Expose()
  contactPerson?: string;
}

// ═══════════════════════════════════════════════════════════════
// WAREHOUSE
// ═══════════════════════════════════════════════════════════════

export class WarehouseResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  warehouseId: string;

  @ApiProperty()
  @ExposeObjectId()
  sellerId: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiPropertyOptional()
  @Expose()
  externalCode?: string;

  @ApiPropertyOptional({ type: WarehouseAddressResponseDto })
  @Expose()
  @Type(() => WarehouseAddressResponseDto)
  address?: WarehouseAddressResponseDto;

  @ApiPropertyOptional({ type: WarehouseContactResponseDto })
  @Expose()
  @Type(() => WarehouseContactResponseDto)
  contact?: WarehouseContactResponseDto;

  @ApiProperty({ enum: WarehouseStatus })
  @Expose()
  status: WarehouseStatus;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// WAREHOUSE PRODUCT
// ═══════════════════════════════════════════════════════════════

export class WarehouseProductResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  warehouseProductId: string;

  @ApiProperty()
  @ExposeObjectId()
  warehouseId: string;

  @ApiProperty()
  @ExposeObjectId()
  productId: string;

  @ApiProperty()
  @Expose()
  stockQuantity: number;

  @ApiProperty()
  @Expose()
  reservedQuantity: number;

  @ApiProperty()
  @Expose()
  availableQuantity: number;

  @ApiProperty({ enum: WarehouseProductStatus })
  @Expose()
  status: WarehouseProductStatus;

  @ApiPropertyOptional()
  @Expose()
  externalCode?: string;

  @ApiPropertyOptional()
  @Expose()
  minStockLevel?: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}
