import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators';
import { WriteOffStatus, WriteOffReason } from 'src/modules/write-off';
import { ReceivingStatus, ReceivingType } from 'src/modules/receiving';
import { TransferStatus } from 'src/modules/transfer';
import { InventoryAuditStatus, InventoryAuditType } from 'src/modules/inventory-audit';

// ═══════════════════════════════════════════════════════════════
// WRITE-OFF
// ═══════════════════════════════════════════════════════════════

class WriteOffItemResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  shopProductId: string;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiProperty({ enum: WriteOffReason })
  @Expose()
  reason: WriteOffReason;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  photos?: string[];
}

export class WriteOffResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  writeOffId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @ExposeObjectId()
  shopId: string;

  @ApiProperty({ enum: WriteOffStatus })
  @Expose()
  status: WriteOffStatus;

  @ApiProperty({ enum: WriteOffReason })
  @Expose()
  reason: WriteOffReason;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;

  @ApiProperty({ type: [WriteOffItemResponseDto] })
  @Expose()
  @Type(() => WriteOffItemResponseDto)
  items: WriteOffItemResponseDto[];

  @ApiProperty()
  @ExposeObjectId()
  createdById: string;

  @ApiPropertyOptional()
  @ExposeObjectId()
  confirmedById?: string;

  @ApiPropertyOptional()
  @Expose()
  confirmedAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class ConfirmWriteOffResultDto {
  @ApiProperty()
  @ExposeObjectId()
  writeOffId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @Expose()
  totalItemsWrittenOff: number;
}

// ═══════════════════════════════════════════════════════════════
// RECEIVING
// ═══════════════════════════════════════════════════════════════

class ReceivingItemResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  shopProductId: string;

  @ApiProperty()
  @Expose()
  expectedQuantity: number;

  @ApiPropertyOptional()
  @Expose()
  actualQuantity?: number;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;
}

export class ReceivingResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  receivingId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @ExposeObjectId()
  shopId: string;

  @ApiProperty({ enum: ReceivingStatus })
  @Expose()
  status: ReceivingStatus;

  @ApiProperty({ enum: ReceivingType })
  @Expose()
  type: ReceivingType;

  @ApiPropertyOptional()
  @Expose()
  supplier?: string;

  @ApiPropertyOptional()
  @Expose()
  supplierInvoice?: string;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;

  @ApiProperty({ type: [ReceivingItemResponseDto] })
  @Expose()
  @Type(() => ReceivingItemResponseDto)
  items: ReceivingItemResponseDto[];

  @ApiProperty()
  @ExposeObjectId()
  createdById: string;

  @ApiPropertyOptional()
  @ExposeObjectId()
  confirmedById?: string;

  @ApiPropertyOptional()
  @Expose()
  confirmedAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class ConfirmReceivingResultDto {
  @ApiProperty()
  @ExposeObjectId()
  receivingId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @Expose()
  totalItemsReceived: number;
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER
// ═══════════════════════════════════════════════════════════════

class TransferItemResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  shopProductId: string;

  @ApiProperty()
  @Expose()
  quantity: number;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;
}

export class TransferResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  transferId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @ExposeObjectId()
  sourceShopId: string;

  @ApiProperty()
  @ExposeObjectId()
  targetShopId: string;

  @ApiProperty({ enum: TransferStatus })
  @Expose()
  status: TransferStatus;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;

  @ApiProperty({ type: [TransferItemResponseDto] })
  @Expose()
  @Type(() => TransferItemResponseDto)
  items: TransferItemResponseDto[];

  @ApiProperty()
  @ExposeObjectId()
  createdById: string;

  @ApiPropertyOptional()
  @ExposeObjectId()
  sentById?: string;

  @ApiPropertyOptional()
  @Expose()
  sentAt?: Date;

  @ApiPropertyOptional()
  @ExposeObjectId()
  receivedById?: string;

  @ApiPropertyOptional()
  @Expose()
  receivedAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class SendTransferResultDto {
  @ApiProperty()
  @ExposeObjectId()
  transferId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @Expose()
  totalItemsSent: number;
}

export class ReceiveTransferResultDto {
  @ApiProperty()
  @ExposeObjectId()
  transferId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @Expose()
  totalItemsReceived: number;
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY AUDIT
// ═══════════════════════════════════════════════════════════════

class InventoryAuditItemResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  shopProductId: string;

  @ApiProperty()
  @Expose()
  expectedQuantity: number;

  @ApiPropertyOptional()
  @Expose()
  actualQuantity?: number;

  @ApiPropertyOptional()
  @Expose()
  difference?: number;

  @ApiProperty()
  @Expose()
  isCounted: boolean;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;
}

export class InventoryAuditResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  inventoryAuditId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @ExposeObjectId()
  shopId: string;

  @ApiProperty({ enum: InventoryAuditStatus })
  @Expose()
  status: InventoryAuditStatus;

  @ApiProperty({ enum: InventoryAuditType })
  @Expose()
  type: InventoryAuditType;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;

  @ApiProperty({ type: [InventoryAuditItemResponseDto] })
  @Expose()
  @Type(() => InventoryAuditItemResponseDto)
  items: InventoryAuditItemResponseDto[];

  @ApiProperty()
  @Expose()
  totalItems: number;

  @ApiProperty()
  @Expose()
  countedItems: number;

  @ApiProperty()
  @Expose()
  surplusItems: number;

  @ApiProperty()
  @Expose()
  shortageItems: number;

  @ApiProperty()
  @Expose()
  matchedItems: number;

  @ApiProperty()
  @ExposeObjectId()
  createdById: string;

  @ApiPropertyOptional()
  @ExposeObjectId()
  startedById?: string;

  @ApiPropertyOptional()
  @Expose()
  startedAt?: Date;

  @ApiPropertyOptional()
  @ExposeObjectId()
  completedById?: string;

  @ApiPropertyOptional()
  @Expose()
  completedAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}

export class CompleteInventoryAuditResultDto {
  @ApiProperty()
  @ExposeObjectId()
  inventoryAuditId: string;

  @ApiProperty()
  @Expose()
  documentNumber: string;

  @ApiProperty()
  @Expose()
  totalItems: number;

  @ApiProperty()
  @Expose()
  surplusItems: number;

  @ApiProperty()
  @Expose()
  shortageItems: number;

  @ApiProperty()
  @Expose()
  matchedItems: number;
}
