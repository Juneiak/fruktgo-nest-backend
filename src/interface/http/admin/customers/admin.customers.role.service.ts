import { Injectable, Inject, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { checkId } from 'src/common/utils';
import { plainToInstance } from 'class-transformer';
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from 'src/common/enums/common.enum';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
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
  LogResponseDto,
  BlockDto,
  transformPaginatedResult
} from 'src/interface/http/common';


@Injectable()
export class AdminCustomersRoleService {
  constructor(
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}
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
    try {
      const result = await this.customerPort.getCustomers(
        new CustomerQueries.GetCustomersQuery({
          verifiedStatuses: queryDto.verifiedStatuses,
          blockedStatuses: queryDto.blockedStatuses,
          sexes: queryDto.sexes,
          fromBirthDate: queryDto.fromBirthDate,
          toBirthDate: queryDto.toBirthDate,
        }),
        { pagination: paginationDto }
      );
      
      return transformPaginatedResult(result, CustomerPreviewResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры запроса'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string
  ): Promise<CustomerFullResponseDto> {

    const customer = await this.ensureCustomerExists(customerId);

    return plainToInstance(CustomerFullResponseDto, customer, { excludeExtraneousValues: true });
  }


  async getCustomerLogs(
    authedAdmin: AuthenticatedUser,
    customerId: string,
    paginationDto: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    try {
      const result = await this.logsPort.getEntityLogs(
        new LogsQueries.GetEntityLogsQuery(
          LogsEnums.LogEntityType.CUSTOMER,
          customerId,
          [UserType.ADMIN] // Логи доступны админу
        ),
        { pagination: paginationDto }
      );

      return transformPaginatedResult(result, LogResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID клиента'),
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async updateCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string,
    dto: UpdateCustomerDto
  ): Promise<CustomerFullResponseDto> {
    try {
      // Проверяем существование клиента
      await this.ensureCustomerExists(customerId);

      await this.customerPort.updateCustomer(
        new CustomerCommands.UpdateCustomerCommand(
          customerId,
          {
            verifiedStatus: dto.verifiedStatus,
            internalNote: dto.internalNote,
          }
        )
      );

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
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID клиента'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных клиента'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async blockCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string,
    dto: BlockDto
  ): Promise<CustomerFullResponseDto> {
    try {
      // Проверяем существование клиента
      await this.ensureCustomerExists(customerId);

      await this.customerPort.blockCustomer(
        new CustomerCommands.BlockCustomerCommand(
          customerId,
          {
            status: dto.status,
            reason: dto.reason,
            code: dto.code,
            blockedUntil: dto.blockedUntil,
          }
        )
      );

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
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID клиента'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных блокировки'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  /**
   * Вспомогательный метод для проверки существования клиента
   * Перехватывает ошибки и преобразует в NotFoundException с читаемым сообщением
   */
  private async ensureCustomerExists(customerId: string) {
    try {
      const customer = await this.customerPort.getCustomer(
        new CustomerQueries.GetCustomerQuery({ customerId })
      );
      return customer;
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID клиента'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}