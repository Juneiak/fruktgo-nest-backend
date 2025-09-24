import { Controller, Get, Post, UseGuards, Param } from '@nestjs/common';
import { EmployeeAuthRoleService } from './employee.auth.role.service';
import { LoginCodeForEmployeeToShopResponseDto, EmployeeAuthResponseDto } from './employee.auth.response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser, AuthenticatedEmployee } from 'src/common/types';
import { ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import {EmployeeAuthGuard} from 'src/common/guards/employee-auth.guard';
import {GetEmployee} from 'src/common/decorators/employee.decorator';

@Controller('')
export class EmployeeAuthController {
  constructor(private readonly employeeAuthRoleService: EmployeeAuthRoleService) {}


  @ApiTags('for employee')
  @ApiOperation({summary: 'Получить код для входа сотрудника в магазин'})
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, TypeGuard)
  @UserType('shop')
  @Get('auth/employee/login-to-shop')
  getLoginCodeForEmployee(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<LoginCodeForEmployeeToShopResponseDto> {
    return this.employeeAuthRoleService.generateLoginCode(authedShop);
  }


  @ApiTags('for employee')
  @ApiOperation({summary: 'Получить код для входа сотрудника в магазин'})
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, TypeGuard)
  @UserType('shop')
  @Get('auth/employee/login-to-shop/:employeeId')
  loginViaTelegram(
    @GetUser() authedShop: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
  ): Promise<LoginCodeForEmployeeToShopResponseDto> {
    return this.employeeAuthRoleService.loginViaTelegram(authedShop, employeeId);
  }
  

  @ApiTags('for employee')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего сотрудника'})
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TypeGuard, EmployeeAuthGuard)
  @UserType('shop')
  @Get('auth/employee/shop-me')
  getEmployeeProfile(
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
  ): Promise<EmployeeAuthResponseDto> {
    return this.employeeAuthRoleService.checkEmployeeInShopAuth(authedShop, authedEmployee);
  }
}