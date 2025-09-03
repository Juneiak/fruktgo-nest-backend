import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { OrderStatus } from '../order.schema';


export class OrderQueryFilterDto {
  @ApiPropertyOptional({ description: 'ID клиента для фильтрации заказов' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'ID продавца/магазина для фильтрации заказов' })
  @IsString()
  @IsOptional()
  shopId?: string;

  @ApiPropertyOptional({ description: 'ID смены для фильтрации заказов' })
  @IsString()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'ID сотрудника для фильтрации заказов' })
  @IsString()
  @IsOptional()
  employeeId?: string;

  @ApiPropertyOptional({ enum: OrderStatus, description: 'Статус заказа для фильтрации' })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Дата начала периода для фильтрации заказов' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Дата конца периода для фильтрации заказов' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

