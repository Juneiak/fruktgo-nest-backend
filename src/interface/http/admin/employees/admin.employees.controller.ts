import { Controller, Patch, Body, Get, Param, UseGuards, Query } from '@nestjs/common';
import { AdminEmployeesRoleService } from './admin.employees.role.service'
import { ApiBearerAuth, ApiTags, ApiOperation} from '@nestjs/swagger';
import {
  EmployeeFullResponseDto,
  EmployeePreviewResponseDto,
} from './admin.employees.response.dtos';
import { UpdateEmployeeDto } from './admin.employees.request.dtos';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { BlockDto } from 'src/interface/http/common/common.request.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dtos';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminEmployeesController {
  constructor(private readonly adminEmployeesRoleService: AdminEmployeesRoleService) {}

  @ApiOperation({summary: 'возвращает всю информацию о всех сотрудниках с пагинацией'})
  @Get()
  getAllEmployees(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto 
  ): Promise<PaginatedResponseDto<EmployeePreviewResponseDto>> {
    return this.adminEmployeesRoleService.getEmployees(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'возвращает всю информацию о сотруднике'})
  @Get(':employeeId')
  getCurrentEmployee(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string
  ): Promise<EmployeeFullResponseDto> {
    return this.adminEmployeesRoleService.getEmployee(authedAdmin, employeeId);
  }


  @ApiOperation({summary: 'обновляет информацию о сотруднике'})
  @Patch(':employeeId')
  updateEmployee(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateEmployeeDto
  ): Promise<EmployeeFullResponseDto> {
    return this.adminEmployeesRoleService.updateEmployee(authedAdmin, employeeId, dto);
  }


  @ApiOperation({summary: 'блокировка сотрудника'})
  @Patch(':employeeId/block')
  blockEmployee(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: BlockDto
  ): Promise<EmployeeFullResponseDto> {
    return this.adminEmployeesRoleService.blockEmployee(authedAdmin, employeeId, dto);
  }


  @ApiOperation({summary: 'возвращает логи сотрудника'})
  @Get(':employeeId/logs')
  getEmployeeLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.adminEmployeesRoleService.getEmployeeLogs(authedAdmin, employeeId, paginationQuery);
  }
}