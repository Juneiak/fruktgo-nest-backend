import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PaginatedResponseDto, LogResponseDto } from "src/interface/http/common/common.response.dtos";
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { plainToInstance } from 'class-transformer';
import { ShiftResponseDto } from './seller.shifts.response.dtos';
import { transformPaginatedResult, checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { ShiftsQueryDto } from './seller.shifts.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { UserType } from 'src/common/enums/common.enum';
import {
  ShiftPort,
  SHIFT_PORT,
  ShiftQueries
} from 'src/modules/shift';
import {
  LogsPort,
  LOGS_PORT,
  LogsQueries,
  LogsEnums
} from 'src/infra/logs';
import {
  AccessPort,
  ACCESS_PORT
} from 'src/infra/access';

@Injectable()
export class SellerShiftsRoleService {
  constructor(
    @Inject(SHIFT_PORT) private readonly shiftPort: ShiftPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
    @Inject(ACCESS_PORT) private readonly accessPort: AccessPort,
  ) {}

  async getShifts(
    authedSeller: AuthenticatedUser, 
    shiftsQueryDto: ShiftsQueryDto, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    // ✅ Централизованная проверка доступа продавца к магазину
    const hasAccess = await this.accessPort.canSellerAccessShop(
      authedSeller.id,
      shiftsQueryDto.shopId
    );
    if (!hasAccess) {
      throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    }

    const query = new ShiftQueries.GetShiftsQuery({
      shopId: shiftsQueryDto.shopId,
      startDate: shiftsQueryDto.startDate ? new Date(shiftsQueryDto.startDate) : undefined,
      endDate: shiftsQueryDto.endDate ? new Date(shiftsQueryDto.endDate) : undefined,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.shiftPort.getShifts(query, queryOptions);
    return transformPaginatedResult(result, ShiftResponseDto);
  }


  async getCurrentShiftOfShop(
    authedSeller: AuthenticatedUser,
    shiftsQueryDto: ShiftsQueryDto
  ): Promise<ShiftResponseDto> {
    // ✅ Централизованная проверка доступа продавца к магазину
    const hasAccess = await this.accessPort.canSellerAccessShop(
      authedSeller.id,
      shiftsQueryDto.shopId
    );
    if (!hasAccess) {
      throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');
    }
    
    const shift = await this.shiftPort.getCurrentShiftOfShop(shiftsQueryDto.shopId);
    
    if (!shift) throw new NotFoundException('Смена не найдена');

    return plainToInstance(ShiftResponseDto, shift, { excludeExtraneousValues: true });
  }


  async getShift(
    authedSeller: AuthenticatedUser,
    shiftId: string
  ): Promise<ShiftResponseDto> {
    // ✅ Централизованная проверка доступа продавца к смене через магазин
    const hasAccess = await this.accessPort.canSellerAccessShift(
      authedSeller.id,
      shiftId
    );
    if (!hasAccess) {
      throw new NotFoundException('Смена не найдена или не принадлежит данному продавцу');
    }

    const query = new ShiftQueries.GetShiftQuery({ shiftId });
    const shift = await this.shiftPort.getShift(query);
    
    if (!shift) throw new NotFoundException('Смена не найдена');

    return plainToInstance(ShiftResponseDto, shift, { excludeExtraneousValues: true });
  }


  async getShiftLogs(
    authedSeller: AuthenticatedUser,
    shiftId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    // ✅ Централизованная проверка доступа продавца к смене через магазин
    const hasAccess = await this.accessPort.canSellerAccessShift(
      authedSeller.id,
      shiftId
    );
    if (!hasAccess) {
      throw new NotFoundException('Смена не найдена или не принадлежит данному продавцу');
    }

    const logsQuery = new LogsQueries.GetEntityLogsQuery(
      LogsEnums.LogEntityType.SHIFT,
      shiftId,
      [UserType.SELLER]
    );
    
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };
    
    const result = await this.logsPort.getEntityLogs(logsQuery, queryOptions);
    return transformPaginatedResult(result, LogResponseDto);
  }
}
