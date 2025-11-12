import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { plainToInstance } from 'class-transformer';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { JobApplicationResponseDto } from './seller.job-applications.response.dtos';
import { CreateJobApplicationDto } from './seller.job-applications.request.dtos';
import { JobApplicationQueryFilterDto } from './seller.job-applications.query.dtos';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { UserType } from "src/common/enums/common.enum";
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import {
  JobApplicationPort,
  JOB_APPLICATION_PORT,
  JobApplicationCommands,
  JobApplicationQueries,
  JobApplicationEnums
} from 'src/modules/job-application';
import {
  EmployeePort,
  EMPLOYEE_PORT,
  EmployeeQueries
} from 'src/modules/employee';
import {
  LogsCommands,
  LogsEvents,
  LogsEnums
} from 'src/infra/logs';


@Injectable()
export class SellerJobApplicationsRoleService {
  constructor(
    @Inject(JOB_APPLICATION_PORT) private readonly jobApplicationPort: JobApplicationPort,
    @Inject(EMPLOYEE_PORT) private readonly employeePort: EmployeePort,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async getJobApplications(
    authedSeller: AuthenticatedUser,
    paginationQuery: PaginationQueryDto,
    filterQuery?: JobApplicationQueryFilterDto
  ): Promise<PaginatedResponseDto<JobApplicationResponseDto>> {
    const query = new JobApplicationQueries.GetJobApplicationsQuery({
      sellerId: authedSeller.id,
      statuses: filterQuery?.statuses,
      fromDate: filterQuery?.fromDate,
      toDate: filterQuery?.toDate,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };
    const result = await this.jobApplicationPort.getPaginatedJobApplications(query, queryOptions);

    return transformPaginatedResult(result, JobApplicationResponseDto);
  }

  async createJobApplication(
    authedSeller: AuthenticatedUser,
    dto: CreateJobApplicationDto
  ): Promise<JobApplicationResponseDto> {
    // Парсим и валидируем номер телефона
    const phoneNumber = parsePhoneNumberFromString(dto.employeePhone, 'RU');
    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new BadRequestException('Некорректный номер телефона');
    }

    // Ищем сотрудника по номеру телефона
    const query = new EmployeeQueries.GetEmployeeQuery({ phone: phoneNumber.number });
    const employee = await this.employeePort.getEmployee(query);
    
    if (!employee) throw new NotFoundException('Сотрудник с таким номером телефона не найден');

    // Создаем заявку (все бизнес-правила проверяются в доменном слое)
    const command = new JobApplicationCommands.CreateJobApplicationCommand({
      sellerId: authedSeller.id,
      employeeId: employee.employeeId,
    });

    const createdApplication = await this.jobApplicationPort.createJobApplication(command);

    // Логируем создание заявки
    this.eventEmitter.emit(
      LogsEvents.LOG_EVENTS.CREATED,
      new LogsCommands.CreateLogCommand({
        entityType: LogsEnums.LogEntityType.EMPLOYEE,
        entityId: employee.employeeId,
        text: `Продавец (ID: ${authedSeller.id}) отправил заявку на прикрепление сотрудника`,
        logLevel: LogsEnums.LogLevel.MEDIUM,
        forRoles: [UserType.ADMIN, UserType.SELLER],
      })
    );

    return plainToInstance(JobApplicationResponseDto, createdApplication, { excludeExtraneousValues: true });
  }


  async deleteJobApplication(
    authedSeller: AuthenticatedUser,
    jobApplicationId: string
  ): Promise<void> {
    checkId([jobApplicationId]);

    // Проверяем существование заявки и принадлежность продавцу
    const query = new JobApplicationQueries.GetJobApplicationsQuery({
      sellerId: authedSeller.id,
    });
    const applications = await this.jobApplicationPort.getJobApplications(query);
    const application = applications.find(app => app.jobApplicationId === jobApplicationId);

    if (!application) throw new NotFoundException('Заявка не найдена или она вам не принадлежит');

    await this.jobApplicationPort.deleteJobApplication(jobApplicationId);

    // Логируем удаление заявки
    this.eventEmitter.emit(
      LogsEvents.LOG_EVENTS.CREATED,
      new LogsCommands.CreateLogCommand({
        entityType: LogsEnums.LogEntityType.EMPLOYEE,
        entityId: application.employee.employeeId.toString(),
        text: `Продавец (ID: ${authedSeller.id}) удалил заявку на прикрепление сотрудника`,
        logLevel: LogsEnums.LogLevel.LOW,
        forRoles: [UserType.ADMIN, UserType.SELLER],
      })
    );
  }
}
