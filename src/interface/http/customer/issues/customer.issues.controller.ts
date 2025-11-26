import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { UserType as UserTypeEnum } from 'src/common/enums/common.enum';
import { PaginationQueryDto } from 'src/interface/http/responses/common.query.dtos';
import { CustomerIssuesRoleService } from './customer.issues.role.service';
import { IssueResponseDto } from './customer.issues.response.dtos';
import { CreateIssueDto } from './customer.issues.request.dtos';
import { PaginatedResponseDto } from 'src/interface/http/shared';

@ApiTags('Customer Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType(UserTypeEnum.CUSTOMER)
@Controller()
export class CustomerIssuesController {
  constructor(private readonly customerIssuesRoleService: CustomerIssuesRoleService) {}

  @ApiOperation({ summary: 'Получение списка обращений клиента' })
  @Get('')
  async getIssues(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<IssueResponseDto>> {
    return this.customerIssuesRoleService.getIssues(authedCustomer, paginationQuery);
  }

  @ApiOperation({ summary: 'Создание нового обращения' })
  @Post('')
  async createIssue(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Body() dto: CreateIssueDto,
  ): Promise<IssueResponseDto> {
    return this.customerIssuesRoleService.createIssue(authedCustomer, dto);
  }

  @ApiOperation({ summary: 'Получение обращения по ID' })
  @Get(':issueId')
  async getIssue(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Param('issueId') issueId: string,
  ): Promise<IssueResponseDto> {
    return this.customerIssuesRoleService.getIssue(authedCustomer, issueId);
  }
}
