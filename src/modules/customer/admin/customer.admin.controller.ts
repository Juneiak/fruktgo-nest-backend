import { Controller, Post, Body, Get, Param, UseGuards, Patch, Query } from '@nestjs/common';
import { 
  CustomerPreviewResponseDto,
  CustomerFullResponseDto,
} from './customer.admin.response.dto';
import { UpdateCustomerDto, NotifyCustomerDto } from './customer.admin.request.dto';
import { CustomerAdminService } from './customer.admin.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { PaginatedResponseDto, PaginationQueryDto, TelegramNotificationResponseDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/customers')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class CustomerAdminController {
  constructor(
    private readonly customerAdminService: CustomerAdminService,
    private readonly notificationService: NotificationService
  ) {}

  @ApiOperation({summary: 'Отправка уведомления клиенту'})
  @Post('/notify')
  notifyCustomer(
    @Body() dto: NotifyCustomerDto
  ): Promise<TelegramNotificationResponseDto> {
    return this.notificationService.notifyCustomer(dto.telegramId, dto.message);
  }

  @ApiOperation({summary: 'Получение списка всех клиентов с пагинацией'})
  @Get('/')
  getAllCustomers(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<CustomerPreviewResponseDto>> {
    return this.customerAdminService.getAllCustomers(authedAdmin, paginationQuery);
  }

  @ApiOperation({summary: 'Получение информации о клиенте'})
  @Get('/:customerId')
  getCustomer( @GetUser() authedAdmin: AuthenticatedUser, @Param('customerId') customerId: string ) {
    return this.customerAdminService.getCustomer(authedAdmin, customerId);
  }

  @ApiOperation({summary: 'Получение логов клиента'})
  @Get('/:customerId/logs')
  getCustomerLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('customerId') customerId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.customerAdminService.getCustomerLogs(authedAdmin, customerId, paginationQuery);
  }

  @ApiOperation({summary: 'Обновление информации о клиенте'})
  @ApiBody({ type: UpdateCustomerDto })
  @Patch('/:customerId')
  updateCustomer(
    @GetUser() authedAdmin: AuthenticatedUser, 
    @Param('customerId') customerId: string, 
    @Body() dto: UpdateCustomerDto ): Promise<CustomerFullResponseDto> {
    return this.customerAdminService.updateCustomer(authedAdmin, customerId, dto);
  }
}
