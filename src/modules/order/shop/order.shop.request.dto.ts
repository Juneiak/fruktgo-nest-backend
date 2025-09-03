import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { testSwaggerIds } from 'src/common/swagger';
import { OrderDeclineReason } from '../order.schema';


export class DeclineOrderByEmployeeDto {
  @ApiProperty({ example: 'Примечание' })
  @IsString()
  @IsOptional()
  comment: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  declineAt: string;

  @ApiProperty({ example: 'Причина отклонения' })
  @IsString()
  @IsEnum(OrderDeclineReason)
  @IsNotEmpty()
  declineReason: OrderDeclineReason;
}


export class PrepareOrderProductByEmployeeDto {
  @ApiProperty({ example: testSwaggerIds.shopProductId, description: 'ID продукта магазина' })
  @IsNotEmpty()
  @IsString()
  shopProductId: string;

  @ApiProperty({ example: 100, description: 'Фактическое количество набранного товара' })
  @IsNotEmpty()
  @IsNumber()
  preparedQuantity: number;
}


export class CompleteOrderAssemblyByEmployeeDto {
  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  assemblyCompletedAt: string;

  // @ApiProperty({ example: [testSwaggerIds.shopProductId] })
  // @IsNotEmpty()
  // @IsArray()
  // assembledOrderProducts: OrderProductResponseDto[];
}

export class HandOrderToCourierByEmployeeDto {
  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  handedToCourierAt: string;
}
