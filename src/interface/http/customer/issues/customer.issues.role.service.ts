import { Injectable, NotFoundException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import { IssueResponseDto } from './customer.issues.response.dtos';
import { CreateIssueDto } from './customer.issues.request.dtos';
import {
  IssuePort,
  ISSUE_PORT,
  IssueCommands,
  IssueQueries,
  IssueEnums
} from 'src/modules/issue';
import { CustomerPort, CUSTOMER_PORT, CustomerQueries } from 'src/modules/customer';
import {
  PaginatedResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/common';


@Injectable()
export class CustomerIssuesRoleService {
  constructor(
    @Inject(ISSUE_PORT) private readonly issuePort: IssuePort,
    @Inject(CUSTOMER_PORT) private readonly customerPort: CustomerPort,
  ) {}

  async getIssues(
    authedCustomer: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<IssueResponseDto>> {
    try {
      const query = new IssueQueries.GetIssuesQuery({
        fromUserType: IssueEnums.IssueUserType.CUSTOMER,
        fromUserId: authedCustomer.id,
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
    authedCustomer: AuthenticatedUser,
    issueId: string
  ): Promise<IssueResponseDto> {
    try {
      const query = new IssueQueries.GetIssueQuery(issueId);
      const issue = await this.issuePort.getIssue(query);

      if (!issue) throw new NotFoundException('Обращение не найдено');
      // Проверяем, что обращение принадлежит данному клиенту
      if (issue.fromUserType !== IssueEnums.IssueUserType.CUSTOMER ||  
          issue.from.toString() !== authedCustomer.id) {
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
    authedCustomer: AuthenticatedUser,
    dto: CreateIssueDto
  ): Promise<IssueResponseDto> {
    try {
      // Получаем данные клиента
      const customer = await this.customerPort.getCustomer(
        new CustomerQueries.GetCustomerQuery({
          customerId: authedCustomer.id
        })
      );
      if (!customer) throw new NotFoundException('Клиент не найден');

      const command = new IssueCommands.CreateIssueCommand({
        telegramId: customer.telegramId,
        userType: IssueEnums.IssueUserType.CUSTOMER,
        userId: authedCustomer.id,
        text: dto.text,
        category: dto.category,
      });
      const createdIssue = await this.issuePort.createIssue(command);

      return plainToInstance(IssueResponseDto, createdIssue, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Клиент не найден'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных обращения'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}
