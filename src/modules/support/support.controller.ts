import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards, Query} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { SupportService } from './support.service';
import { IssueFullResponseDto, IssuePreviewResponseDto, UpdateIssueDto } from './support.dtos';
import { ApiIssueIdParam } from 'src/common/swagger';
import { IssueUserType, IssueStatusFilter } from './issue.schema';
import {IssueFilterDto} from './support.filter';

@ApiBearerAuth('JWT-auth')
@Controller('support')
@UseGuards(JwtAuthGuard, TypeGuard)
export class SupportController {
  constructor(
    private readonly supportService: SupportService
  ) {}

  @ApiTags('for admin')
  @ApiOperation({summary: 'Обновить заявку'})
  @ApiBody({type: UpdateIssueDto})
  @ApiIssueIdParam()
  @ApiOkResponse({type: IssueFullResponseDto})
  // ====================================================
  @UserType('admin')
  @Patch('/issues/:issueId')
  updateIssue(
    @Body() dto: UpdateIssueDto, 
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('issueId') issueId: string
  ): Promise<IssueFullResponseDto> {
    return this.supportService.updateIssue(authedAdmin, issueId, dto);
  }

  @ApiTags('for admin')
  @ApiOperation({summary: 'Получить полную заявку'})
  @ApiIssueIdParam()
  @ApiOkResponse({type: IssueFullResponseDto})
  // ====================================================
  @UserType('admin')
  @Get('/issues/:issueId')
  getFullIssue(
    @GetUser() authedAdmin: AuthenticatedUser, 
    @Param('issueId') issueId: string
  ): Promise<IssueFullResponseDto> {
    return this.supportService.getIssue(authedAdmin, issueId);
  }

  @ApiTags('for admin')
  @ApiOperation({summary: 'Получить список заявок c фильтром и пагинацией'})
  @ApiOkResponse({type: () => PaginatedResponseDto})
  @ApiQuery({name: 'fromUserType', required: false, type: String, enum: IssueUserType})
  @ApiQuery({name: 'statusFilter', required: false, type: String, enum: IssueStatusFilter})
  @ApiQuery({name: 'from', required: false, type: String})
  // ====================================================
  @UserType('admin')
  @Get('/issues')
  getIssues(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() filterDto: IssueFilterDto,
    @Query() paginationQuery?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<IssuePreviewResponseDto>> {
    return this.supportService.getIssues(authedAdmin, filterDto, paginationQuery);
  }

}
