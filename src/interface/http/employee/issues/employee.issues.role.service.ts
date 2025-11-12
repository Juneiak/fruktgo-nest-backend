import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
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
    const query = new IssueQueries.GetIssuesQuery({
      fromUserType: IssueEnums.IssueUserType.EMPLOYEE,
      fromUserId: authedEmployee.id,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.issuePort.getPaginatedIssues(query, queryOptions);
    return transformPaginatedResult(result, IssueResponseDto);
  }

  async getIssue(
    authedEmployee: AuthenticatedUser,
    issueId: string
  ): Promise<IssueResponseDto> {
    checkId([issueId]);

    const issue = await this.issuePort.getIssue(issueId);
    if (!issue) throw new NotFoundException('Обращение не найдено');

    // Проверяем, что обращение принадлежит данному сотруднику
    if (issue.fromUserType !== IssueEnums.IssueUserType.EMPLOYEE ||  
        issue.from.toString() !== authedEmployee.id) {
      throw new NotFoundException('Обращение не найдено');
    }

    return plainToInstance(IssueResponseDto, issue, { excludeExtraneousValues: true });
  }

  async createIssue(
    authedEmployee: AuthenticatedUser,
    dto: CreateIssueDto
  ): Promise<IssueResponseDto> {
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
  }
}
