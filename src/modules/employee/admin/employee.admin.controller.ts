import { Controller, Patch, Body, Get, Param, UseGuards, Query } from '@nestjs/common';
import { EmployeeAdminService } from './employee.admin.service';
import { ApiBearerAuth, ApiTags, ApiOperation} from '@nestjs/swagger';
import {
  EmployeeFullResponseDto,
  EmployeePreviewResponseDto,
} from './employee.admin.response.dto';
import { UpdateEmployeeDto } from './employee.admin.request.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import { BlockDto } from 'src/common/dtos/block.dto';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/employees')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class EmployeeAdminController {
  constructor(private readonly employeeAdminService: EmployeeAdminService) {}

  @ApiOperation({summary: 'возвращает всю информацию о всех сотрудниках с пагинацией'})
  @Get('/')
  getAllEmployees(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto 
  ): Promise<PaginatedResponseDto<EmployeePreviewResponseDto>> {
    return this.employeeAdminService.getEmployees(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'возвращает всю информацию о сотруднике'})
  @Get('/:employeeId')
  getCurrentEmployee(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string
  ): Promise<EmployeeFullResponseDto> {
    return this.employeeAdminService.getEmployee(authedAdmin, employeeId);
  }


  @ApiOperation({summary: 'обновляет информацию о сотруднике'})
  @Patch('/:employeeId')
  updateEmployee(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateEmployeeDto
  ): Promise<EmployeeFullResponseDto> {
    return this.employeeAdminService.updateEmployee(authedAdmin, employeeId, dto);
  }


  @ApiOperation({summary: 'блокировка сотрудника'})
  @Patch('/:employeeId/block')
  blockEmployee(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: BlockDto
  ): Promise<EmployeeFullResponseDto> {
    return this.employeeAdminService.blockEmployee(authedAdmin, employeeId, dto);
  }


  @ApiOperation({summary: 'возвращает логи сотрудника'})
  @Get('/:employeeId/logs')
  getEmployeeLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.employeeAdminService.getEmployeeLogs(authedAdmin, employeeId, paginationQuery);
  }
}