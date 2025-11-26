import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { UserType as UserTypeEnum } from 'src/common/enums/common.enum';
import { PaginationQueryDto } from 'src/interface/http/responses/common.query.dtos';
import { EmployeeIssuesRoleService } from './employee.issues.role.service';
import { IssueResponseDto } from './employee.issues.response.dtos';
import { CreateIssueDto } from './employee.issues.request.dtos';
import { PaginatedResponseDto } from 'src/interface/http/shared';

@ApiTags('Employee Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType(UserTypeEnum.EMPLOYEE)
@Controller()
export class EmployeeIssuesController {
  constructor(private readonly employeeIssuesRoleService: EmployeeIssuesRoleService) {}

  @ApiOperation({ summary: 'Получение списка обращений сотрудника' })
  @Get('')
  async getIssues(
    @GetUser() authedEmployee: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<IssueResponseDto>> {
    return this.employeeIssuesRoleService.getIssues(authedEmployee, paginationQuery);
  }

  @ApiOperation({ summary: 'Создание нового обращения' })
  @Post('')
  async createIssue(
    @GetUser() authedEmployee: AuthenticatedUser,
    @Body() dto: CreateIssueDto,
  ): Promise<IssueResponseDto> {
    return this.employeeIssuesRoleService.createIssue(authedEmployee, dto);
  }

  @ApiOperation({ summary: 'Получение обращения по ID' })
  @Get(':issueId')
  async getIssue(
    @GetUser() authedEmployee: AuthenticatedUser,
    @Param('issueId') issueId: string,
  ): Promise<IssueResponseDto> {
    return this.employeeIssuesRoleService.getIssue(authedEmployee, issueId);
  }
}
