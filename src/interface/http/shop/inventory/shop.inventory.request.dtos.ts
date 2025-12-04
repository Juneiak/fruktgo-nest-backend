import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, ValidateNested, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { WriteOffReason } from 'src/modules/write-off';
import { ReceivingType } from 'src/modules/receiving';
import { InventoryAuditType } from 'src/modules/inventory-audit';

// ═══════════════════════════════════════════════════════════════
// WRITE-OFF
// ═══════════════════════════════════════════════════════════════

class WriteOffItemDto {
  @ApiProperty()
  @IsString()
  shopProductId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: WriteOffReason })
  @IsEnum(WriteOffReason)
  reason: WriteOffReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class CreateWriteOffDto {
  @ApiProperty({ enum: WriteOffReason })
  @IsEnum(WriteOffReason)
  reason: WriteOffReason;

  @ApiProperty({ type: [WriteOffItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WriteOffItemDto)
  items: WriteOffItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ConfirmWriteOffDto {
  // No additional fields needed - confirmation is just an action
}

// ═══════════════════════════════════════════════════════════════
// RECEIVING
// ═══════════════════════════════════════════════════════════════

class ReceivingItemDto {
  @ApiProperty()
  @IsString()
  shopProductId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  expectedQuantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateReceivingDto {
  @ApiProperty({ enum: ReceivingType })
  @IsEnum(ReceivingType)
  type: ReceivingType;

  @ApiProperty({ type: [ReceivingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivingItemDto)
  items: ReceivingItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierInvoice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

class ConfirmReceivingItemDto {
  @ApiProperty()
  @IsString()
  shopProductId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  actualQuantity: number;
}

export class ConfirmReceivingDto {
  @ApiProperty({ type: [ConfirmReceivingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmReceivingItemDto)
  actualItems: ConfirmReceivingItemDto[];
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER
// ═══════════════════════════════════════════════════════════════

class TransferItemDto {
  @ApiProperty()
  @IsString()
  shopProductId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CreateTransferDto {
  @ApiProperty({ description: 'ID магазина-получателя' })
  @IsString()
  targetShopId: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY AUDIT
// ═══════════════════════════════════════════════════════════════

export class CreateInventoryAuditDto {
  @ApiProperty({ enum: InventoryAuditType })
  @IsEnum(InventoryAuditType)
  type: InventoryAuditType;

  @ApiPropertyOptional({ type: [String], description: 'Для PARTIAL - список shopProductId' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shopProductIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

class UpdateItemCountDto {
  @ApiProperty()
  @IsString()
  shopProductId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  actualQuantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class BulkUpdateItemCountsDto {
  @ApiProperty({ type: [UpdateItemCountDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateItemCountDto)
  items: UpdateItemCountDto[];
}

export class CompleteInventoryAuditDto {
  @ApiProperty({ description: 'Применить результаты к остаткам' })
  @IsBoolean()
  applyResults: boolean;
}
