import { Injectable, NotFoundException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import { IssueResponseDto } from './employee.issues.response.dtos';
import { CreateIssueDto } from './employee.issues.request.dtos';
import {
  IssuePort,
  ISSUE_PORT,
  IssueCommands,
  IssueQueries,
  IssueEnums
} from 'src/modules/issue';
import { EmployeePort, EMPLOYEE_PORT, EmployeeQueries } from 'src/modules/employee';
import {
  PaginatedResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/common';


@Injectable()
export class EmployeeIssuesRoleService {
  constructor(
    @Inject(ISSUE_PORT) private readonly issuePort: IssuePort,
    @Inject(EMPLOYEE_PORT) private readonly employeePort: EmployeePort,
  ) {}

  async getIssues(
    authedEmployee: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<IssueResponseDto>> {
    try {
      const query = new IssueQueries.GetIssuesQuery({
        fromUserType: IssueEnums.IssueUserType.EMPLOYEE,
        fromUserId: authedEmployee.id,
      });

      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };

      const result = await this.issuePort.getPaginatedIssues(query, queryOptions);
      return transformPaginatedResult(result, IssueResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getIssue(
    authedEmployee: AuthenticatedUser,
    issueId: string
  ): Promise<IssueResponseDto> {
    try {
      const query = new IssueQueries.GetIssueQuery(issueId);
      const issue = await this.issuePort.getIssue(query);
      if (!issue) throw new NotFoundException('Обращение не найдено');

      // Проверяем, что обращение принадлежит данному сотруднику
      if (issue.fromUserType !== IssueEnums.IssueUserType.EMPLOYEE ||  
          issue.from.toString() !== authedEmployee.id) {
        throw new NotFoundException('Обращение не найдено');
      }

      return plainToInstance(IssueResponseDto, issue, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Обращение не найдено'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID обращения'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async createIssue(
    authedEmployee: AuthenticatedUser,
    dto: CreateIssueDto
  ): Promise<IssueResponseDto> {
    try {
      // Получаем данные сотрудника
      const employee = await this.employeePort.getEmployee(
        new EmployeeQueries.GetEmployeeQuery({
          employeeId: authedEmployee.id
        })
      );
      if (!employee) throw new NotFoundException('Сотрудник не найден');

      const command = new IssueCommands.CreateIssueCommand({
        telegramId: employee.telegramId,
        userType: IssueEnums.IssueUserType.EMPLOYEE,
        userId: authedEmployee.id,
        text: dto.text,
        category: dto.category,
      });

      const createdIssue = await this.issuePort.createIssue(command);

      return plainToInstance(IssueResponseDto, createdIssue, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Сотрудник не найден'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры запроса'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных обращения'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}
