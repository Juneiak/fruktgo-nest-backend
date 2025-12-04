import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators';
import { 
  StockMovementType, 
  StockMovementDocumentType, 
  StockMovementActorType,
  WriteOffReason,
} from 'src/modules/stock-movement';

export class StockMovementDocumentDto {
  @ApiProperty({ enum: StockMovementDocumentType })
  @Expose()
  type: StockMovementDocumentType;

  @ApiProperty()
  @ExposeObjectId()
  id: string;

  @ApiPropertyOptional()
  @Expose()
  number?: string;
}

export class StockMovementActorDto {
  @ApiProperty({ enum: StockMovementActorType })
  @Expose()
  type: StockMovementActorType;

  @ApiPropertyOptional()
  @ExposeObjectId()
  id?: string;

  @ApiPropertyOptional()
  @Expose()
  name?: string;
}

export class StockMovementResponseDto {
  @ApiProperty()
  @ExposeObjectId()
  stockMovementId: string;

  @ApiProperty({ enum: StockMovementType })
  @Expose()
  type: StockMovementType;

  @ApiProperty()
  @ExposeObjectId()
  shopProductId: string;

  @ApiProperty()
  @ExposeObjectId()
  shopId: string;

  @ApiProperty({ description: 'Изменение количества (+ или -)' })
  @Expose()
  quantity: number;

  @ApiProperty({ description: 'Остаток до операции' })
  @Expose()
  balanceBefore: number;

  @ApiProperty({ description: 'Остаток после операции' })
  @Expose()
  balanceAfter: number;

  @ApiPropertyOptional({ type: StockMovementDocumentDto })
  @Expose()
  @Type(() => StockMovementDocumentDto)
  document?: StockMovementDocumentDto;

  @ApiProperty({ type: StockMovementActorDto })
  @Expose()
  @Type(() => StockMovementActorDto)
  actor: StockMovementActorDto;

  @ApiPropertyOptional({ enum: WriteOffReason })
  @Expose()
  writeOffReason?: WriteOffReason;

  @ApiPropertyOptional()
  @Expose()
  comment?: string;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}
