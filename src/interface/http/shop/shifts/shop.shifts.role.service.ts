import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  OpenShiftByEmployeeDto,
  CloseShiftByEmployeeDto,
} from './shop.shifts.request.dtos';
import { ShiftPreviewResponseDto } from './shop.shifts.response.dtos';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser, AuthenticatedEmployee } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import {
  ShiftPort,
  SHIFT_PORT,
  ShiftQueries,
  ShiftCommands
} from 'src/modules/shift';
import {
  ShopPort,
  SHOP_PORT,
  ShopQueries
} from 'src/modules/shop';

import {
  PaginatedResponseDto,
  transformPaginatedResult,
  PaginationQueryDto,
} from 'src/interface/http/common';



@Injectable()
export class ShopShiftsRoleService {
  constructor(
    @Inject(SHIFT_PORT) private readonly shiftPort: ShiftPort,
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort
  ) {}




  async getShifts(
    authedShop: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    checkId([authedShop.id]);

    const query = new ShiftQueries.GetShiftsQuery({
      shopId: authedShop.id,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.shiftPort.getShifts(query, queryOptions);
    return transformPaginatedResult(result, ShiftPreviewResponseDto);
  }


  async getShift(
    authedShop: AuthenticatedUser,
    shiftId: string
  ): Promise<ShiftPreviewResponseDto> {
    checkId([shiftId, authedShop.id]);

    const shift = await this.shiftPort.getShift(shiftId);
    if (!shift) throw new NotFoundException('Смена не найдена');
    
    if (shift.shop.toString() !== authedShop.id) {
      throw new NotFoundException('Смена не принадлежит этому магазину');
    }
    
    return plainToInstance(ShiftPreviewResponseDto, shift, { 
      excludeExtraneousValues: true 
    });
  }




  // TODO: Реализовать openShiftByEmployee через ShiftPort
  // Требуется:
  // 1. Проверка статуса магазина через ShopPort
  // 2. Проверка сотрудника через EmployeePort
  // 3. OpenShiftCommand с актёром и SLA
  // 4. Логирование через LogsPort
  // async openShiftByEmployee(
  //   authedShop: AuthenticatedUser,
  //   authedEmployee: AuthenticatedEmployee,
  //   dto: OpenShiftByEmployeeDto
  // ): Promise<ShiftPreviewResponseDto> {
  //   checkId([authedShop.id, authedEmployee.id]);
  //   // Проверка магазина
  //   const shopQuery = new ShopQueries.GetShopQuery({ shopId: authedShop.id });
  //   const shop = await this.shopPort.getShop(shopQuery);
  //   if (!shop) throw new NotFoundException('Магазин не найден');
  //   // Требуется EmployeePort для проверки сотрудника
  //   // Требуется SLA из магазина для OpenShiftCommand
  //   throw new NotFoundException('Метод в разработке');
  // }
  



  // TODO: Реализовать closeShiftByEmployee через ShiftPort
  // Требуется:
  // 1. Проверка магазина и сотрудника
  // 2. StartClosingShiftCommand
  // 3. CloseShiftCommand
  // 4. Логирование и уведомления
  // async closeShiftByEmployee(
  //   authedShop: AuthenticatedUser,
  //   authedEmployee: AuthenticatedEmployee,
  //   shiftId: string,
  //   dto: CloseShiftByEmployeeDto
  // ): Promise<ShiftPreviewResponseDto> {
  //   checkId([authedShop.id, authedEmployee.id, shiftId]);
  //   throw new NotFoundException('Метод в разработке');
  // }

}
