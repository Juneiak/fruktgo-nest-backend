import { Controller, Get, Param, UseGuards, Query, Patch } from '@nestjs/common';
import { AdminShiftsRoleService } from './admin.shifts.role.service';
import { ShiftResponseDto } from './admin.shifts.response.dtos';
import { ShiftsQueryDto } from './admin.shifts.query.dtos';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, LogResponseDto } from 'src/interface/http/shared';
import { PaginationQueryDto } from 'src/interface/http/responses/common.query.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminShiftsController {
  constructor(
    private readonly adminShiftsRoleService: AdminShiftsRoleService
  ) {}

  @ApiOperation({summary: 'Получает превью смен с пагинацией'})
  @Get()
  getShifts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() shiftsQueryDto: ShiftsQueryDto,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    return this.adminShiftsRoleService.getShifts(authedAdmin, shiftsQueryDto, paginationQuery);
  }


  @ApiOperation({summary: 'Получает полную информацию о смене'})
  @Get(':shiftId')
  getShopShift(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftResponseDto> {
    return this.adminShiftsRoleService.getShift(authedAdmin, shiftId);
  }


  @ApiOperation({summary: 'Получает логи смены'})
  @Get(':shiftId/logs')
  getShiftLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    return this.adminShiftsRoleService.getShiftLogs(authedAdmin, shiftId, paginationQuery);
  }


  @ApiOperation({summary: 'Закрывает смену принудительно'})
  @Patch(':shiftId/force-close')
  forceCloseShift(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftResponseDto> {
    return this.adminShiftsRoleService.forceCloseShift(authedAdmin, shiftId);
  }
}
