import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { UserType as UserTypeEnum } from 'src/common/enums/common.enum';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { SellerIssuesRoleService } from './seller.issues.role.service';
import { IssueResponseDto } from './seller.issues.response.dtos';
import { CreateIssueDto } from './seller.issues.request.dtos';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';

@ApiTags('Seller Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType(UserTypeEnum.SELLER)
@Controller()
export class SellerIssuesController {
  constructor(private readonly sellerIssuesRoleService: SellerIssuesRoleService) {}

  @ApiOperation({ summary: 'Получение списка обращений продавца' })
  @Get('')
  async getIssues(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<IssueResponseDto>> {
    return this.sellerIssuesRoleService.getIssues(authedSeller, paginationQuery);
  }

  @ApiOperation({ summary: 'Создание нового обращения' })
  @Post('')
  async createIssue(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: CreateIssueDto,
  ): Promise<IssueResponseDto> {
    return this.sellerIssuesRoleService.createIssue(authedSeller, dto);
  }

  @ApiOperation({ summary: 'Получение обращения по ID' })
  @Get(':issueId')
  async getIssue(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('issueId') issueId: string,
  ): Promise<IssueResponseDto> {
    return this.sellerIssuesRoleService.getIssue(authedSeller, issueId);
  }
}
