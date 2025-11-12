import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ShopShiftsRoleService } from './shop.shifts.role.service';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { ShiftPreviewResponseDto } from './shop.shifts.response.dtos';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';

@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShopShiftsController {
  constructor(
    private readonly shopShiftsRoleService: ShopShiftsRoleService
  ) {}

  @ApiOperation({summary: 'Получение информации о сменах'})
  @Get()
  getShifts(
    @GetUser() authedShop: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    return this.shopShiftsRoleService.getShifts(authedShop, paginationQuery);
  }


  @ApiOperation({summary: 'Получение информации о смене'})
  @Get(':shiftId')
  getShift(
    @GetUser() authedShop: AuthenticatedUser,
    @Param('shiftId') shiftId: string
  ): Promise<ShiftPreviewResponseDto> {
    return this.shopShiftsRoleService.getShift(authedShop, shiftId);
  }


  // TODO: Реализовать открытие смены сотрудником
  // Требуется EmployeePort для проверки сотрудника
  // @ApiOperation({summary: 'Открытие смены сотрудником'})
  // @UseGuards(EmployeeAuthGuard)
  // @Post()
  // openShift(
  //   @GetUser() authedShop: AuthenticatedUser,
  //   @GetEmployee() authedEmployee: AuthenticatedEmployee,
  //   @Body() dto: OpenShiftByEmployeeDto
  // ): Promise<ShiftPreviewResponseDto> {
  //   return this.shopShiftsRoleService.openShiftByEmployee(authedShop, authedEmployee, dto);
  // }


  // TODO: Реализовать закрытие смены сотрудником
  // Требуется EmployeePort для проверки сотрудника
  // @ApiOperation({summary: 'Закрытие смены сотрудником'})
  // @UseGuards(EmployeeAuthGuard)
  // @Delete(':shiftId')
  // closeShift(
  //   @GetUser() authedShop: AuthenticatedUser,
  //   @GetEmployee() authedEmployee: AuthenticatedEmployee,
  //   @Param('shiftId') shiftId: string,
  //   @Body() dto: CloseShiftByEmployeeDto
  // ): Promise<ShiftPreviewResponseDto> {
  //   return this.shopShiftsRoleService.closeShiftByEmployee(authedShop, authedEmployee, shiftId, dto);
  // }
}
