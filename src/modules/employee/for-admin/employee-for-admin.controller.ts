import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards, Query } from '@nestjs/common';
import { EmployeeForAdminService } from './employee-for-admin.service';

import { ApiBearerAuth, ApiTags, ApiOperation, ApiOkResponse, ApiBody} from '@nestjs/swagger';
import {
  EmployeeForAdminFullResponseDto,
  EmployeeForAdminPreviewResponseDto,
  UpdateEmployeeByAdminDto,
  EmployeeShiftPreviewResponseDto,
} from './employee-for-admin.dtos';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { ApiEmployeeIdParam } from 'src/common/swagger';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('employees/for-admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class EmployeeForAdminController {
  constructor(private readonly employeeForAdminService: EmployeeForAdminService) {}

  @ApiOperation({summary: 'возвращает всю информацию о всех сотрудниках с пагинацией'})
  @ApiOkResponse({type: () => PaginatedResponseDto})
  // ====================================================
  @Get('/')
  getAllEmployees(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto 
  ): Promise<PaginatedResponseDto<EmployeeForAdminPreviewResponseDto>> {
    return this.employeeForAdminService.getEmployees(authedAdmin, paginationQuery);
  }

  @ApiOperation({summary: 'возвращает всю информацию о сотруднике'})
  @ApiEmployeeIdParam()
  @ApiOkResponse({type: EmployeeForAdminFullResponseDto})
  // ====================================================
  @Get('/:employeeId')
  getCurrentEmployee(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string
  ): Promise<EmployeeForAdminFullResponseDto> {
    return this.employeeForAdminService.getEmployee(authedAdmin, employeeId);
  }

  @ApiOperation({summary: 'возвращает логи сотрудника'})
  @ApiEmployeeIdParam()
  @ApiOkResponse({type: () => PaginatedLogDto})
  // ====================================================
  @Get('/:employeeId/logs')
  getEmployeeLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.employeeForAdminService.getEmployeeLogs(authedAdmin, employeeId, paginationQuery);
  }

  @ApiOperation({summary: 'обновляет информацию о сотруднике'})
  @ApiEmployeeIdParam()
  @ApiOkResponse({type: EmployeeForAdminFullResponseDto})
  // ====================================================
  @Patch('/:employeeId')
  updateEmployee(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateEmployeeByAdminDto
  ): Promise<EmployeeForAdminFullResponseDto> {
    return this.employeeForAdminService.updateEmployee(authedAdmin, employeeId, dto);
  }

  @ApiOperation({summary: 'Возвращает список смен, открытых сотрудником, с пагинацией'})
  @ApiEmployeeIdParam()
  @ApiOkResponse({type: () => PaginatedResponseDto})
  @Get('/:employeeId/shifts')
  getCurrentEmployeeShifts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<EmployeeShiftPreviewResponseDto>> {
    return this.employeeForAdminService.getEmployeeShifts(authedAdmin, employeeId, paginationQuery);
  }


  

}