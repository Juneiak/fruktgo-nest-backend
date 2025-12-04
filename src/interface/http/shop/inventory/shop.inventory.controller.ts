import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ShopInventoryRoleService } from './shop.inventory.role.service';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { EmployeeAuthGuard } from 'src/common/guards/employee-auth.guard';
import { GetEmployee } from 'src/common/decorators/employee.decorator';
import { AuthenticatedEmployee } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/interface/http/shared';
import {
  CreateWriteOffDto,
  ConfirmWriteOffDto,
  CreateReceivingDto,
  ConfirmReceivingDto,
  CreateTransferDto,
  CreateInventoryAuditDto,
  BulkUpdateItemCountsDto,
  CompleteInventoryAuditDto,
} from './shop.inventory.request.dtos';
import {
  WriteOffResponseDto,
  ConfirmWriteOffResultDto,
  ReceivingResponseDto,
  ConfirmReceivingResultDto,
  TransferResponseDto,
  SendTransferResultDto,
  ReceiveTransferResultDto,
  InventoryAuditResponseDto,
  CompleteInventoryAuditResultDto,
} from './shop.inventory.response.dtos';

@ApiTags('for shop - inventory')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(EmployeeAuthGuard)
export class ShopInventoryController {
  constructor(
    private readonly shopInventoryRoleService: ShopInventoryRoleService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // WRITE-OFF
  // ═══════════════════════════════════════════════════════════════

  @ApiOperation({ summary: 'Получение списка документов списания' })
  @Get('write-offs')
  getWriteOffs(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WriteOffResponseDto>> {
    return this.shopInventoryRoleService.getWriteOffs(authedEmployee, paginationQuery);
  }

  @ApiOperation({ summary: 'Получение документа списания' })
  @Get('write-offs/:writeOffId')
  getWriteOff(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('writeOffId') writeOffId: string,
  ): Promise<WriteOffResponseDto> {
    return this.shopInventoryRoleService.getWriteOff(authedEmployee, writeOffId);
  }

  @ApiOperation({ summary: 'Создание документа списания (черновик)' })
  @Post('write-offs')
  createWriteOff(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CreateWriteOffDto,
  ): Promise<WriteOffResponseDto> {
    return this.shopInventoryRoleService.createWriteOff(authedEmployee, dto);
  }

  @ApiOperation({ summary: 'Подтверждение списания (списывает остатки)' })
  @Post('write-offs/:writeOffId/confirm')
  confirmWriteOff(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('writeOffId') writeOffId: string,
  ): Promise<ConfirmWriteOffResultDto> {
    return this.shopInventoryRoleService.confirmWriteOff(authedEmployee, writeOffId);
  }

  // ═══════════════════════════════════════════════════════════════
  // RECEIVING
  // ═══════════════════════════════════════════════════════════════

  @ApiOperation({ summary: 'Получение списка документов приёмки' })
  @Get('receivings')
  getReceivings(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ReceivingResponseDto>> {
    return this.shopInventoryRoleService.getReceivings(authedEmployee, paginationQuery);
  }

  @ApiOperation({ summary: 'Получение документа приёмки' })
  @Get('receivings/:receivingId')
  getReceiving(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('receivingId') receivingId: string,
  ): Promise<ReceivingResponseDto> {
    return this.shopInventoryRoleService.getReceiving(authedEmployee, receivingId);
  }

  @ApiOperation({ summary: 'Создание документа приёмки (черновик)' })
  @Post('receivings')
  createReceiving(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CreateReceivingDto,
  ): Promise<ReceivingResponseDto> {
    return this.shopInventoryRoleService.createReceiving(authedEmployee, dto);
  }

  @ApiOperation({ summary: 'Подтверждение приёмки (добавляет остатки)' })
  @Post('receivings/:receivingId/confirm')
  confirmReceiving(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('receivingId') receivingId: string,
    @Body() dto: ConfirmReceivingDto,
  ): Promise<ConfirmReceivingResultDto> {
    return this.shopInventoryRoleService.confirmReceiving(authedEmployee, receivingId, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER
  // ═══════════════════════════════════════════════════════════════

  @ApiOperation({ summary: 'Исходящие перемещения' })
  @Get('transfers/outgoing')
  getOutgoingTransfers(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TransferResponseDto>> {
    return this.shopInventoryRoleService.getOutgoingTransfers(authedEmployee, paginationQuery);
  }

  @ApiOperation({ summary: 'Входящие перемещения' })
  @Get('transfers/incoming')
  getIncomingTransfers(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TransferResponseDto>> {
    return this.shopInventoryRoleService.getIncomingTransfers(authedEmployee, paginationQuery);
  }

  @ApiOperation({ summary: 'Получение документа перемещения' })
  @Get('transfers/:transferId')
  getTransfer(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('transferId') transferId: string,
  ): Promise<TransferResponseDto> {
    return this.shopInventoryRoleService.getTransfer(authedEmployee, transferId);
  }

  @ApiOperation({ summary: 'Создать перемещение (исходящее)' })
  @Post('transfers')
  createTransfer(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    return this.shopInventoryRoleService.createTransfer(authedEmployee, dto);
  }

  @ApiOperation({ summary: 'Отправить перемещение (списывает остатки)' })
  @Post('transfers/:transferId/send')
  sendTransfer(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('transferId') transferId: string,
  ): Promise<SendTransferResultDto> {
    return this.shopInventoryRoleService.sendTransfer(authedEmployee, transferId);
  }

  @ApiOperation({ summary: 'Принять перемещение (добавляет остатки)' })
  @Post('transfers/:transferId/receive')
  receiveTransfer(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('transferId') transferId: string,
  ): Promise<ReceiveTransferResultDto> {
    return this.shopInventoryRoleService.receiveTransfer(authedEmployee, transferId);
  }

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY AUDIT
  // ═══════════════════════════════════════════════════════════════

  @ApiOperation({ summary: 'Список инвентаризаций' })
  @Get('audits')
  getInventoryAudits(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<InventoryAuditResponseDto>> {
    return this.shopInventoryRoleService.getInventoryAudits(authedEmployee, paginationQuery);
  }

  @ApiOperation({ summary: 'Получение документа инвентаризации' })
  @Get('audits/:auditId')
  getInventoryAudit(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('auditId') auditId: string,
  ): Promise<InventoryAuditResponseDto> {
    return this.shopInventoryRoleService.getInventoryAudit(authedEmployee, auditId);
  }

  @ApiOperation({ summary: 'Создать инвентаризацию' })
  @Post('audits')
  createInventoryAudit(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CreateInventoryAuditDto,
  ): Promise<InventoryAuditResponseDto> {
    return this.shopInventoryRoleService.createInventoryAudit(authedEmployee, dto);
  }

  @ApiOperation({ summary: 'Начать инвентаризацию' })
  @Post('audits/:auditId/start')
  startInventoryAudit(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('auditId') auditId: string,
  ): Promise<InventoryAuditResponseDto> {
    return this.shopInventoryRoleService.startInventoryAudit(authedEmployee, auditId);
  }

  @ApiOperation({ summary: 'Обновить подсчёты по позициям' })
  @Patch('audits/:auditId/items')
  updateItemCounts(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('auditId') auditId: string,
    @Body() dto: BulkUpdateItemCountsDto,
  ): Promise<InventoryAuditResponseDto> {
    return this.shopInventoryRoleService.updateItemCounts(authedEmployee, auditId, dto);
  }

  @ApiOperation({ summary: 'Завершить инвентаризацию' })
  @Post('audits/:auditId/complete')
  completeInventoryAudit(
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('auditId') auditId: string,
    @Body() dto: CompleteInventoryAuditDto,
  ): Promise<CompleteInventoryAuditResultDto> {
    return this.shopInventoryRoleService.completeInventoryAudit(authedEmployee, auditId, dto);
  }
}
