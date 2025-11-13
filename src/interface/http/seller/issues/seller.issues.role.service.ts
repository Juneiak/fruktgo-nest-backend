import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { IssueResponseDto } from './seller.issues.response.dtos';
import { CreateIssueDto } from './seller.issues.request.dtos';
import {
  IssuePort,
  ISSUE_PORT,
  IssueCommands,
  IssueQueries,
  IssueEnums
} from 'src/modules/issue';
import { SellerPort, SELLER_PORT, SellerQueries } from 'src/modules/seller';

import {
  PaginatedResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/common';

@Injectable()
export class SellerIssuesRoleService {
  constructor(
    @Inject(ISSUE_PORT) private readonly issuePort: IssuePort,
    @Inject(SELLER_PORT) private readonly sellerPort: SellerPort,
  ) {}

  async getIssues(
    authedSeller: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<IssueResponseDto>> {
    
    const query = new IssueQueries.GetIssuesQuery({
      fromUserType: IssueEnums.IssueUserType.SELLER,
      fromUserId: authedSeller.id,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.issuePort.getPaginatedIssues(query, queryOptions);
    return transformPaginatedResult(result, IssueResponseDto);

  }


  async getIssue(
    authedSeller: AuthenticatedUser,
    issueId: string
  ): Promise<IssueResponseDto> {

    const query = new IssueQueries.GetIssueQuery(issueId);
    const issue = await this.issuePort.getIssue(query);
    if (!issue) throw new NotFoundException('Обращение не найдено');

    // Проверяем, что обращение принадлежит данному продавцу
    if (issue.fromUserType !== IssueEnums.IssueUserType.SELLER ||  
        issue.from.toString() !== authedSeller.id) {
      throw new NotFoundException('Обращение не найдено');
    }

    return plainToInstance(IssueResponseDto, issue, { excludeExtraneousValues: true });

  }

  
  async createIssue(
    authedSeller: AuthenticatedUser,
    dto: CreateIssueDto
  ): Promise<IssueResponseDto> {

    // Получаем данные продавца
    const seller = await this.sellerPort.getSeller(
      new SellerQueries.GetSellerQuery({
        sellerId: authedSeller.id
      })
    );
    if (!seller) throw new NotFoundException('Продавец не найден');

    const command = new IssueCommands.CreateIssueCommand({
      telegramId: seller.telegramId,
      userType: IssueEnums.IssueUserType.SELLER,
      userId: authedSeller.id,
      text: dto.text,
      category: dto.category,
    });

    const createdIssue = await this.issuePort.createIssue(command);

    return plainToInstance(IssueResponseDto, createdIssue, { excludeExtraneousValues: true });
  
  }
}
