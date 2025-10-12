import { Controller, Patch, Body, Get, Param, UseGuards, Query} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { AdminSupportRoleService } from './admin.support.role.service';
import { IssueFullResponseDto, IssuePreviewResponseDto } from './admin.support.response.dtos';
import { UpdateIssueDto } from './admin.support.request.dtos';
import { IssueQueryDto } from './admin.support.query';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminIssuesController {
  constructor(
    private readonly adminIssuesRoleService: AdminIssuesRoleService
  ) {}

  @ApiOperation({summary: 'Обновить заявку'})
  @Patch('issues/:issueId')
  updateIssue(
    @Body() dto: UpdateIssueDto, 
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('issueId') issueId: string
  ): Promise<IssueFullResponseDto> {
    return this.adminIssuesRoleService.updateIssue(authedAdmin, issueId, dto);
  }

  @ApiOperation({summary: 'Получить полную заявку'})
  @Get('issues/:issueId')
  getFullIssue(
    @GetUser() authedAdmin: AuthenticatedUser, 
    @Param('issueId') issueId: string
  ): Promise<IssueFullResponseDto> {
    return this.adminIssuesRoleService.getIssue(authedAdmin, issueId);
  }

  @ApiOperation({summary: 'Получить список заявок c фильтром и пагинацией'})
  @Get('issues')
  getIssues(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() issueQuery: IssueQueryDto,
    @Query() paginationQuery?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<IssuePreviewResponseDto>> {
    return this.adminIssuesRoleService.getIssues(authedAdmin, issueQuery, paginationQuery);
  }

}
