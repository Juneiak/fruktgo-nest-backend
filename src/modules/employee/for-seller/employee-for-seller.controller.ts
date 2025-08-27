import { Controller, Delete, Patch, Get,Body, Param, UseGuards, Post, Query } from '@nestjs/common';
import { EmployeeForSellerService } from './employee-for-seller.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiOkResponse, ApiBody} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { EmployeeForSellerResponseDto, UpdateEmployeeDto } from './employee-for-seller.dtos';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { ApiEmployeeIdParam, ApiRequestToEmployeeIdParam} from 'src/common/swagger';
import {RequestToEmployeeFromSellerDto, RequestToEmployeeToSellerResponseDto} from './employee-for-seller.dtos';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('employees/for-seller')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class EmployeeForSellerController {
  constructor(private readonly employeeForSellerService: EmployeeForSellerService) {}


  // ====================================================
  // REQUESTS TO EMPLOYEE
  // ====================================================

  @ApiOperation({summary: 'Получает запросы селлеров к сотрудникам'})
  @ApiOkResponse({type: RequestToEmployeeToSellerResponseDto, isArray: true})
  // ====================================================
  @Get('/requests')
  getSellerRequestsToEmployees(
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<RequestToEmployeeToSellerResponseDto[]> {
    return this.employeeForSellerService.getSellerRequestsToEmployees(authedSeller);
  }


  @ApiOperation({summary: 'отправить запрос сотрдунику по его телеграм айди или номеру телефона'})
  @ApiOkResponse({type: RequestToEmployeeToSellerResponseDto, isArray: true})
  // ====================================================
  @Post('/requests')
  sendRequestToEmployee(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: RequestToEmployeeFromSellerDto
  ): Promise<RequestToEmployeeToSellerResponseDto[]> {
    return this.employeeForSellerService.sendRequestToEmployeeByPhoneFromSeller(authedSeller, dto);
  }

  
  @ApiOperation({summary: 'Удаление запроса к сотруднику'})
  @ApiRequestToEmployeeIdParam()
  @ApiOkResponse({type: RequestToEmployeeToSellerResponseDto, isArray: true})
  // ====================================================
  @Delete('/requests/:requestToEmployeeId')
  deleteRequestToEmployee(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('requestToEmployeeId') requestToEmployeeId: string
  ): Promise<RequestToEmployeeToSellerResponseDto[]> {
    return this.employeeForSellerService.deleteRequestToEmployee(authedSeller, requestToEmployeeId);
  }

  

  // ====================================================
  // EMPLOYEES
  // ====================================================

  @ApiOperation({summary: 'возвращает информацию о сотрудниках'})
  @ApiOkResponse({type: PaginatedResponseDto<EmployeeForSellerResponseDto>})
  // ====================================================
  @Get('/')
  getSellerShopEmployees(
    @GetUser() seller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('shopId') shopId
  ): Promise<PaginatedResponseDto<EmployeeForSellerResponseDto>> {
    return this.employeeForSellerService.getSellerEmployees(seller, paginationQuery, {shopId});
  }


  @ApiOperation({summary: 'возвращает информацию о сотруднике'})
  @ApiEmployeeIdParam()
  @ApiOkResponse({type: EmployeeForSellerResponseDto})
  // ====================================================
  @Get('/:employeeId')
  getSellerShopEmployee(
    @Param('employeeId') employeeId: string,
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<EmployeeForSellerResponseDto> {
    return this.employeeForSellerService.getSellerEmployee(authedSeller, employeeId);
  }


  @ApiOperation({summary: 'Обновление информации о сотруднике'})
  @ApiEmployeeIdParam()
  @ApiBody({type: UpdateEmployeeDto})
  @ApiOkResponse({type: EmployeeForSellerResponseDto})
  // ====================================================
  @Patch('/:employeeId')
  updateSellerEmployee(
    @Param('employeeId') employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<EmployeeForSellerResponseDto> {
    return this.employeeForSellerService.updateSellerEmployee(authedSeller, employeeId, updateEmployeeDto);
  }


  @ApiOperation({summary: 'Открепить сотрудника'})
  @ApiEmployeeIdParam()
  @ApiOkResponse({type: EmployeeForSellerResponseDto})
  // ====================================================
  @Delete('/:employeeId')
  unpinEmployee(
    @Param('employeeId') employeeId: string,
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<EmployeeForSellerResponseDto> {
    return this.employeeForSellerService.unpinEmployeeFromSeller(authedSeller, employeeId);
  }


}