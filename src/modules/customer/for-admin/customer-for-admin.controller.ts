import { Controller, Post, Body, Get, Param, UseGuards, Patch, Query } from '@nestjs/common';
import { 
  CustomerForAdminPreviewResponseDto,
  CustomerForAdminFullResponseDto,
  UpdateCustomerByAdminDto,
  NotifyCustomerDto
} from './customer-for-admin.dtos';
import { CustomerForAdminService } from './customer-for-admin.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { PaginatedResponseDto, PaginationQueryDto, TelegramNotificationResponseDto } from 'src/common/dtos';
import { LogDto, PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('customers/for-admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class CustomerForAdminController {
  constructor(
    private readonly customerForAdminService: CustomerForAdminService,
    private readonly notificationService: NotificationService
  ) {}

  @ApiOperation({summary: 'Отправка уведомления клиенту'})
  // ====================================================
  @Post('/notify')
  notifyCustomer(
    @Body() dto: NotifyCustomerDto
  ): Promise<TelegramNotificationResponseDto> {
    return this.notificationService.notifyCustomer(dto.telegramId, dto.message);
  }

  @ApiOperation({summary: 'Получение списка всех клиентов с пагинацией'})
  @ApiOkResponse({ type: () => PaginatedResponseDto })
  // ====================================================
  @Get('/')
  getAllCustomers(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<CustomerForAdminPreviewResponseDto>> {
    return this.customerForAdminService.getAllCustomers(authedAdmin, paginationQuery);
  }

  @ApiOperation({summary: 'Получение информации о клиенте'})
  @ApiOkResponse({ type: CustomerForAdminFullResponseDto })
  // ====================================================
  @Get('/:customerId')
  getCustomer( @GetUser() authedAdmin: AuthenticatedUser, @Param('customerId') customerId: string ) {
    return this.customerForAdminService.getCustomer(authedAdmin, customerId);
  }

  @ApiOperation({summary: 'Получение логов клиента'})
  @ApiOkResponse({ type: () => PaginatedLogDto })
  // ====================================================
  @Get('/:customerId/logs')
  getCustomerLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('customerId') customerId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.customerForAdminService.getCustomerLogs(authedAdmin, customerId, paginationQuery);
  }

  @ApiOperation({summary: 'Обновление информации о клиенте'})
  @ApiOkResponse({ type: CustomerForAdminFullResponseDto })
  @ApiBody({ type: UpdateCustomerByAdminDto })
  // ====================================================
  @Patch('/:customerId')
  updateCustomer(
    @GetUser() authedAdmin: AuthenticatedUser, 
    @Param('customerId') customerId: string, 
    @Body() dto: UpdateCustomerByAdminDto ): Promise<CustomerForAdminFullResponseDto> {
    return this.customerForAdminService.updateCustomer(authedAdmin, customerId, dto);
  }

  
}
