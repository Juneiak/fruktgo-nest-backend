import { Controller, Body, Param, UseGuards, Delete, Post } from '@nestjs/common';
import { ShiftShopService } from './shift.shop.service';
import { 
  OpenShiftByEmployeeDto,
  CloseShiftByEmployeeDto,
} from './shift.shop.request.dto';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { EmployeeAuthGuard } from 'src/common/guards/employee-auth.guard';
import { GetEmployee } from 'src/common/decorators/employee.decorator';
import { AuthenticatedUser, AuthenticatedEmployee } from 'src/common/types';
import { ShiftPreviewResponseDto } from './shift.shop.response.dto';

@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller('shops/shifts')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShiftShopController {
  constructor(
    private readonly shopForShopService: ShiftShopService,
  ) {}

  @ApiOperation({summary: 'открытие смены сотрудником'})
  @UseGuards(EmployeeAuthGuard)
  @Post('/shifts')
  openShift(
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: OpenShiftByEmployeeDto
  ): Promise<ShiftPreviewResponseDto> {
    return this.shopForShopService.openShiftByEmployee(authedShop, authedEmployee, dto);
  }


  @ApiOperation({summary: 'закрытие смены сотрудником'})
  @UseGuards(EmployeeAuthGuard)
  @Delete('/shifts/:shiftId')
  closeShift(
    @Param('shiftId') shiftId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CloseShiftByEmployeeDto
  ): Promise<ShiftPreviewResponseDto> {
    return this.shopForShopService.closeShiftByEmployee(authedShop, authedEmployee, shiftId, dto);
  }

}
