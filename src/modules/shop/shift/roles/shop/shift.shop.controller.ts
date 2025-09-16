import { Controller, Body, Param, UseGuards, Delete, Post, Get, Query } from '@nestjs/common';
import { ShiftShopService } from './shift.shop.service';
import { 
  OpenShiftByEmployeeDto,
  CloseShiftByEmployeeDto,
} from './shift.shop.request.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { EmployeeAuthGuard } from 'src/common/guards/employee-auth.guard';
import { GetEmployee } from 'src/common/decorators/employee.decorator';
import { AuthenticatedUser, AuthenticatedEmployee } from 'src/common/types';
import { ShiftPreviewResponseDto } from './shift.shop.response.dtos';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';

@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller('shop/shifts')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShiftShopController {
  constructor(
    private readonly shiftShopService: ShiftShopService,
  ) {}

  @ApiOperation({summary: 'получение информации о сменах'})
  @Get('/')
  getShifts(
    @GetUser() authedShop: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    return this.shiftShopService.getShifts(authedShop, paginationQuery);
  }


  @ApiOperation({summary: 'получение информации о смен'})
  @Get('/:shiftId')
  getShift(
    @GetUser() authedShop: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftPreviewResponseDto> {
    return this.shiftShopService.getShift(authedShop, shiftId);
  }


  @ApiOperation({summary: 'открытие смены сотрудником'})
  @UseGuards(EmployeeAuthGuard)
  @Post('/')
  openShift(
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: OpenShiftByEmployeeDto
  ): Promise<ShiftPreviewResponseDto> {
    return this.shiftShopService.openShiftByEmployee(authedShop, authedEmployee, dto);
  }


  @ApiOperation({summary: 'закрытие смены сотрудником'})
  @UseGuards(EmployeeAuthGuard)
  @Delete('/:shiftId')
  closeShift(
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('shiftId') shiftId: string,
    @Body() dto: CloseShiftByEmployeeDto
  ): Promise<ShiftPreviewResponseDto> {
    return this.shiftShopService.closeShiftByEmployee(authedShop, authedEmployee, shiftId, dto);
  }

}
