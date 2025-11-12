import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { plainToInstance } from 'class-transformer';
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from 'src/common/enums/common.enum';
import { CommonListQueryOptions } from 'src/common/types/queries';
import {
  LOGS_PORT,
  LogsPort,
  LogsQueries,
  LogsEnums,
  LogsCommands,
  LogsEvents
} from 'src/infra/logs';
import {
  CustomerPort,
  CUSTOMER_PORT,
  CustomerCommands,
  CustomerQueries,
} from 'src/modules/customer';
import {
  CustomerFullResponseDto,
  CustomerPreviewResponseDto
} from './admin.customers.response.dtos';
import {
  NotifyCustomerDto,
  UpdateCustomerDto
} from './admin.customers.request.dtos';
import { CustomerQueryDto } from './admin.customers.query.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import {
  PaginatedResponseDto,
  MessageResponseDto,
  LogResponseDto
} from 'src/interface/http/common/common.response.dtos';
import { BlockDto } from 'src/interface/http/common/common.request.dtos';


@Injectable()
export class AdminCustomersRoleService {
  constructor(
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async sendNotificationToCustomer(
    authedAdmin: AuthenticatedUser,
    dto: NotifyCustomerDto
  ): Promise<MessageResponseDto> {
    // TODO: Процесс отправки уведомления клиенту (требует оркестратора)
    // Должен включать:
    // 1. Проверку существования клиента
    // 2. Отправку через NotificationService
    // 3. Логирование действия
    throw new Error('Not implemented: notification orchestrator required');
  }


  async getCustomers(
    authedAdmin: AuthenticatedUser,
    queryDto: CustomerQueryDto,
    paginationDto: PaginationQueryDto
  ): Promise<PaginatedResponseDto<CustomerPreviewResponseDto>> {

    const query = new CustomerQueries.GetCustomersQuery({
      verifiedStatuses: queryDto.verifiedStatuses,
      blockedStatuses: queryDto.blockedStatuses,
      sexes: queryDto.sexes,
      fromBirthDate: queryDto.fromBirthDate,
      toBirthDate: queryDto.toBirthDate,
    });
    
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationDto
    };
    const result = await this.customerPort.getCustomers(query, queryOptions);
    
    return transformPaginatedResult(result, CustomerPreviewResponseDto);
  }


  async getCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string
  ): Promise<CustomerFullResponseDto> {
    checkId([customerId]);

    const query = new CustomerQueries.GetCustomerQuery({ customerId });
    const customer = await this.customerPort.getCustomer(query);
    if (!customer) throw new NotFoundException('Клиент не найден');

    return plainToInstance(CustomerFullResponseDto, customer, { excludeExtraneousValues: true });
  }


  async getCustomerLogs(
    authedAdmin: AuthenticatedUser,
    customerId: string,
    paginationDto: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    checkId([customerId]);

    const query = new LogsQueries.GetEntityLogsQuery(
      LogsEnums.LogEntityType.CUSTOMER,
      customerId,
      [UserType.ADMIN] // Логи доступны админу
    );

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationDto
    };

    const result = await this.logsPort.getEntityLogs(query, queryOptions);

    return transformPaginatedResult(result, LogResponseDto);
  }


  async updateCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string,
    dto: UpdateCustomerDto
  ): Promise<CustomerFullResponseDto> {
    checkId([customerId]);

    // Проверяем существование клиента
    const existingCustomer = await this.customerPort.getCustomer(new CustomerQueries.GetCustomerQuery({ customerId }));
    if (!existingCustomer) throw new NotFoundException('Клиент не найден');

    const command = new CustomerCommands.UpdateCustomerCommand(
      customerId,
      {
        verifiedStatus: dto.verifiedStatus,
        internalNote: dto.internalNote,
      }
    );
    await this.customerPort.updateCustomer(command);

    // Логируем изменение
    this.eventEmitter.emit(
      LogsEvents.LOG_EVENTS.CREATED,
      new LogsCommands.CreateLogCommand({
        entityType: LogsEnums.LogEntityType.CUSTOMER,
        entityId: customerId,
        text: `Администратор (ID: ${authedAdmin.id}) обновил данные клиента`,
        logLevel: LogsEnums.LogLevel.MEDIUM,
        forRoles: [UserType.ADMIN],
      })
    );
    
    // Получаем обновленного клиента
    return this.getCustomer(authedAdmin, customerId);
  }


  async blockCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string,
    dto: BlockDto
  ): Promise<CustomerFullResponseDto> {
    checkId([customerId]);

    // Проверяем существование клиента
    const existingCustomer = await this.customerPort.getCustomer(new CustomerQueries.GetCustomerQuery({ customerId }));
    if (!existingCustomer) throw new NotFoundException('Клиент не найден');

    const command = new CustomerCommands.BlockCustomerCommand(
      customerId,
      {
        status: dto.status,
        reason: dto.reason,
        code: dto.code,
        blockedUntil: dto.blockedUntil,
      }
    );
    await this.customerPort.blockCustomer(command);

    // Логируем блокировку/разблокировку
    const actionText = dto.status === 'blocked' 
      ? `заблокировал клиента${dto.reason ? ` (причина: ${dto.reason})` : ''}` 
      : 'разблокировал клиента';
    
    this.eventEmitter.emit(
      LogsEvents.LOG_EVENTS.CREATED,
      new LogsCommands.CreateLogCommand({
        entityType: LogsEnums.LogEntityType.CUSTOMER,
        entityId: customerId,
        text: `Администратор (ID: ${authedAdmin.id}) ${actionText}`,
        logLevel: dto.status === 'blocked' ? LogsEnums.LogLevel.HIGH : LogsEnums.LogLevel.MEDIUM,
        forRoles: [UserType.ADMIN],
      })
    );

    // Получаем обновленного клиента
    return this.getCustomer(authedAdmin, customerId);
  }
}