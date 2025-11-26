import { Injectable, Inject, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EmployeePreviewResponseDto,
  EmployeeFullResponseDto
} from './admin.employees.response.dtos';
import { UpdateEmployeeDto } from './admin.employees.request.dtos';
import { plainToInstance } from 'class-transformer';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { UserType } from "src/common/enums/common.enum";
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import {
  PaginatedResponseDto,
  LogResponseDto,
  transformPaginatedResult,
  PaginationQueryDto,
  BlockDto
} from 'src/interface/http/shared';
import {
  EmployeePort,
  EMPLOYEE_PORT,
  EmployeeCommands,
  EmployeeQueries
} from 'src/modules/employee';
import {
  LOGS_PORT,
  LogsPort,
  LogsQueries,
  LogsEnums,
  LogsCommands,
  LogsEvents
} from 'src/infra/logs';

@Injectable()
export class AdminEmployeesRoleService {
  constructor(
    @Inject(EMPLOYEE_PORT) private readonly employeePort: EmployeePort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async getEmployees(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<EmployeePreviewResponseDto>> {
    try {
      const query = new EmployeeQueries.GetEmployeesQuery();
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };
      const result = await this.employeePort.getEmployees(query, queryOptions);

      return transformPaginatedResult(result, EmployeePreviewResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getEmployee(
    authedAdmin: AuthenticatedUser,
    employeeId: string
  ): Promise<EmployeeFullResponseDto> {
    try {
      const query = new EmployeeQueries.GetEmployeeQuery({ employeeId });
      const employee = await this.employeePort.getEmployee(query);
      if (!employee) throw new NotFoundException('Сотрудник не найден');

      return plainToInstance(EmployeeFullResponseDto, employee, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Сотрудник не найден'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры запроса'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID сотрудника'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getEmployeeLogs(
    authedAdmin: AuthenticatedUser,
    employeeId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    try {
      const query = new LogsQueries.GetEntityLogsQuery(
        LogsEnums.LogEntityType.EMPLOYEE,
        employeeId,
        [UserType.ADMIN]
      );
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };
      const result = await this.logsPort.getEntityLogs(query, queryOptions);

      return transformPaginatedResult(result, LogResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID сотрудника'),
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Сотрудник не найден'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async updateEmployee(
    authedAdmin: AuthenticatedUser,
    employeeId: string,
    dto: UpdateEmployeeDto
  ): Promise<EmployeeFullResponseDto> {
    try {
      // Проверяем существование сотрудника
      const existingEmployee = await this.employeePort.getEmployee(new EmployeeQueries.GetEmployeeQuery({ employeeId }));
      if (!existingEmployee) throw new NotFoundException('Сотрудник не найден');

      const command = new EmployeeCommands.UpdateEmployeeCommand(
        employeeId,
        {
          verifiedStatus: dto.verifiedStatus,
          internalNote: dto.internalNote,
        }
      );
      await this.employeePort.updateEmployee(command);

      // Логируем изменение
      this.eventEmitter.emit(
        LogsEvents.LOG_EVENTS.CREATED,
        new LogsCommands.CreateLogCommand({
          entityType: LogsEnums.LogEntityType.EMPLOYEE,
          entityId: employeeId,
          text: `Администратор (ID: ${authedAdmin.id}) обновил данные сотрудника`,
          logLevel: LogsEnums.LogLevel.MEDIUM,
          forRoles: [UserType.ADMIN],
        })
      );

      return this.getEmployee(authedAdmin, employeeId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Сотрудник не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID сотрудника'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных сотрудника'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async blockEmployee(
    authedAdmin: AuthenticatedUser,
    employeeId: string,
    dto: BlockDto
  ): Promise<EmployeeFullResponseDto> {
    try {
      // Проверяем существование сотрудника
      const existingEmployee = await this.employeePort.getEmployee(new EmployeeQueries.GetEmployeeQuery({ employeeId }));
      if (!existingEmployee) throw new NotFoundException('Сотрудник не найден');

      const command = new EmployeeCommands.BlockEmployeeCommand(
        employeeId,
        {
          status: dto.status,
          reason: dto.reason,
          code: dto.code,
          blockedUntil: dto.blockedUntil,
        }
      );
      await this.employeePort.blockEmployee(command);

      // Логируем блокировку/разблокировку
      const actionText = dto.status === 'blocked'
        ? `заблокировал сотрудника${dto.reason ? ` (причина: ${dto.reason})` : ''}`
        : 'разблокировал сотрудника';
      this.eventEmitter.emit(
        LogsEvents.LOG_EVENTS.CREATED,
        new LogsCommands.CreateLogCommand({
          entityType: LogsEnums.LogEntityType.EMPLOYEE,
          entityId: employeeId,
          text: `Администратор (ID: ${authedAdmin.id}) ${actionText}`,
          logLevel: dto.status === 'blocked' ? LogsEnums.LogLevel.HIGH : LogsEnums.LogLevel.MEDIUM,
          forRoles: [UserType.ADMIN],
        })
      );

      return this.getEmployee(authedAdmin, employeeId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Сотрудник не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID сотрудника'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных блокировки'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}