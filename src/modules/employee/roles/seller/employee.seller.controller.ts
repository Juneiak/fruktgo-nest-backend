import { Controller, Delete, Patch, Get,Body, Param, UseGuards, Post, Query } from '@nestjs/common';
import { EmployeeSellerService } from './employee.seller.service';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { EmployeeResponseDto, RequestToEmployeeResponseDto} from './employee.seller.response.dtos';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import {RequestToEmployeeDto, UpdateEmployeeDto} from './employee.seller.request.dtos';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { EmployeeFilterDto } from './employee.seller.filter.dtos';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/employees')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class EmployeeSellerController {
  constructor(private readonly employeeSellerService: EmployeeSellerService) {}

  // ====================================================
  // REQUESTS TO EMPLOYEE
  // ====================================================
  @ApiOperation({summary: 'Получает запросы селлеров к сотрудникам'})
  @Get('/requests')
  getSellerRequestsToEmployees(
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<RequestToEmployeeResponseDto[]> {
    return this.employeeSellerService.getSellerRequestsToEmployees(authedSeller);
  }


  @ApiOperation({summary: 'отправить запрос сотрдунику по его телеграм айди или номеру телефона'})
  @Post('/requests')
  sendRequestToEmployee(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: RequestToEmployeeDto
  ): Promise<RequestToEmployeeResponseDto[]> {
    return this.employeeSellerService.sendRequestToEmployeeByPhoneFromSeller(authedSeller, dto);
  }

  
  @ApiOperation({summary: 'Удаление запроса к сотруднику'})
  @Delete('/requests/:requestToEmployeeId')
  deleteRequestToEmployee(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('requestToEmployeeId') requestToEmployeeId: string
  ): Promise<RequestToEmployeeResponseDto[]> {
    return this.employeeSellerService.deleteRequestToEmployee(authedSeller, requestToEmployeeId);
  }



  // ====================================================
  // EMPLOYEES
  // ====================================================
  @ApiOperation({summary: 'возвращает информацию о сотрудниках'})
  @Get('/')
  getSellerShopEmployees(
    @GetUser() seller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query() filterQuery: EmployeeFilterDto
  ): Promise<PaginatedResponseDto<EmployeeResponseDto>> {
    return this.employeeSellerService.getSellerEmployees(seller, paginationQuery, filterQuery);
  }


  @ApiOperation({summary: 'возвращает информацию о сотруднике'})
  @Get('/:employeeId')
  getSellerShopEmployee(
    @Param('employeeId') employeeId: string,
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<EmployeeResponseDto> {
    return this.employeeSellerService.getSellerEmployee(authedSeller, employeeId);
  }


  @ApiOperation({summary: 'Обновление информации о сотруднике'})
  @Patch('/:employeeId')
  updateSellerEmployee(
    @Param('employeeId') employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<EmployeeResponseDto> {
    return this.employeeSellerService.updateSellerEmployee(authedSeller, employeeId, updateEmployeeDto);
  }


  @ApiOperation({summary: 'Открепить сотрудника от продавца'})
  @Delete('/:employeeId')
  unpinEmployee(
    @Param('employeeId') employeeId: string,
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<EmployeeResponseDto> {
    return this.employeeSellerService.unpinEmployeeFromSeller(authedSeller, employeeId);
  }
};
