import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import { EmployeeResponseDto } from './seller.employees.response.dtos';
import { UpdateEmployeeDto } from './seller.employees.request.dtos';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { UserType } from "src/common/enums/common.enum";
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { EmployeeQueryFilterDto } from './seller.employees.query.dtos';
import {
  EmployeePort,
  EMPLOYEE_PORT,
  EmployeeCommands,
  EmployeeQueries,
  EmployeeEnums
} from 'src/modules/employee';
import {
  LogsCommands,
  LogsEvents,
  LogsEnums
} from 'src/infra/logs';


@Injectable()
export class SellerEmployeesRoleService {
  constructor(
    @Inject(EMPLOYEE_PORT) private readonly employeePort: EmployeePort,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async getSellerEmployee(
    authedSeller: AuthenticatedUser,
    employeeId: string
  ): Promise<EmployeeResponseDto> {
    checkId([employeeId]);

    const query = new EmployeeQueries.GetEmployeeQuery({ employeeId });
    const employee = await this.employeePort.getEmployee(query);
    if (!employee) throw new NotFoundException('Сотрудник не найден');

    // Проверяем, что сотрудник принадлежит данному продавцу
    if (!employee.employer || employee.employer.toString() !== authedSeller.id) {
      throw new ForbiddenException('Сотрудник не прикреплен к вам');
    }

    return plainToInstance(EmployeeResponseDto, employee, { excludeExtraneousValues: true });
  }


  async getSellerEmployees(
    authedSeller: AuthenticatedUser,
    paginationQuery: PaginationQueryDto,
    filterQuery?: EmployeeQueryFilterDto
  ): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    const query = new EmployeeQueries.GetEmployeesQuery({
      sellerId: authedSeller.id,
      shopId: filterQuery?.shopId,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };
    const result = await this.employeePort.getEmployees(query, queryOptions);

    return transformPaginatedResult(result, EmployeeResponseDto);
  }


  async updateSellerEmployee(
    authedSeller: AuthenticatedUser,
    employeeId: string,
    dto: UpdateEmployeeDto
  ): Promise<EmployeeResponseDto> {
    checkId([employeeId]);

    // Проверяем существование сотрудника и принадлежность продавцу
    const existingEmployee = await this.employeePort.getEmployee(new EmployeeQueries.GetEmployeeQuery({ employeeId }));
    if (!existingEmployee) throw new NotFoundException('Сотрудник не найден');
    if (!existingEmployee.employer) throw new ForbiddenException('У сотрудника нет привязанного продавца');
    if (existingEmployee.employer.toString() !== authedSeller.id) {
      throw new ForbiddenException('У вас нет прав на обновление этого сотрудника');
    }
    if (existingEmployee.openedShift) {
      throw new ForbiddenException('У сотрудника есть открытая смена, нужно её закрыть');
    }

    // TODO: Проверка pinnedTo - требует ShopPort
    // if (dto.pinnedTo) {
    //   checkId([dto.pinnedTo]);
    //   const shop = await this.shopPort.getShop(new ShopQueries.GetShopQuery({ shopId: dto.pinnedTo }));
    //   if (!shop || shop.owner.toString() !== authedSeller.id) {
    //     throw new ForbiddenException('Магазин не найден или не принадлежит вам');
    //   }
    // }

    const command = new EmployeeCommands.UpdateEmployeeCommand(
      employeeId,
      {
        position: dto.position,
        salary: dto.salary?.toString(),
        sellerNote: dto.sellerNote,
        // status: dto.pinnedTo ? EmployeeEnums.EmployeeStatus.WORKING : undefined,
      }
    );

    await this.employeePort.updateEmployee(command);

    // Логируем изменение
    this.eventEmitter.emit(
      LogsEvents.LOG_EVENTS.CREATED,
      new LogsCommands.CreateLogCommand({
        entityType: LogsEnums.LogEntityType.EMPLOYEE,
        entityId: employeeId,
        text: `Продавец (ID: ${authedSeller.id}) обновил данные сотрудника`,
        logLevel: LogsEnums.LogLevel.MEDIUM,
        forRoles: [UserType.ADMIN, UserType.SELLER],
      })
    );

    return this.getSellerEmployee(authedSeller, employeeId);
  }

  // TODO: unpinEmployeeFromSeller требует оркестровой обработки
  // Необходимо обновить связи между Employee, Seller, Shop и очистить связанные данные
}