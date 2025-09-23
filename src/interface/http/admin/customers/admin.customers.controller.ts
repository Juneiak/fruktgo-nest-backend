import { Controller, Post, Body, Get, Param, UseGuards, Patch, Query } from '@nestjs/common';
import { 
  CustomerPreviewResponseDto,
  CustomerFullResponseDto,
} from './admin.customers.response.dtos';
import { UpdateCustomerDto, NotifyCustomerDto } from './admin.customers.request.dtos';
import { AdminCustomersRoleService } from './admin.customers.role.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { PaginatedResponseDto, MessageResponseDto } from 'src/interface/http/common/common.response.dtos';
import { BlockDto } from 'src/interface/http/common/common.request.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dto';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminCustomersController {
  constructor(
    private readonly customerAdminService: AdminCustomersRoleService,
  ) {}

  // TODO: finish this
  @ApiOperation({summary: 'Отправка уведомления клиенту'})
  @Post('notify')
  notifyCustomer(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Body() dto: NotifyCustomerDto
  ): Promise<MessageResponseDto> {
    return this.customerAdminService.sendNotificationToCustomer(authedAdmin, dto);
  }


  @ApiOperation({summary: 'Получение списка всех клиентов с пагинацией'})
  @Get()
  getAllCustomers(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<CustomerPreviewResponseDto>> {
    return this.customerAdminService.getAllCustomers(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'Получение информации о клиенте'})
  @Get(':customerId')
  getCustomer( @GetUser() authedAdmin: AuthenticatedUser, @Param('customerId') customerId: string ) {
    return this.customerAdminService.getCustomer(authedAdmin, customerId);
  }


  @ApiOperation({summary: 'Получение логов клиента'})
  @Get(':customerId/logs')
  getCustomerLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('customerId') customerId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.customerAdminService.getCustomerLogs(authedAdmin, customerId, paginationQuery);
  }


  @ApiOperation({summary: 'Обновление информации о клиенте'})
  @Patch(':customerId')
  updateCustomer(
    @GetUser() authedAdmin: AuthenticatedUser, 
    @Param('customerId') customerId: string, 
    @Body() dto: UpdateCustomerDto ): Promise<CustomerFullResponseDto> {
    return this.customerAdminService.updateCustomer(authedAdmin, customerId, dto);
  }


  @ApiOperation({summary: 'Блокировка клиента'})
  @Patch(':customerId/block')  
  blockCustomer(
    @GetUser() authedAdmin: AuthenticatedUser, 
    @Param('customerId') customerId: string, 
    @Body() dto: BlockDto
  ): Promise<CustomerFullResponseDto> {
    return this.customerAdminService.blockCustomer(authedAdmin, customerId, dto);
  }
}
