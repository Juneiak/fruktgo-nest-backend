import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DomainErrorCode, handleServiceError } from 'src/common/errors';
import { AuthenticatedEmployee } from 'src/common/types';

function getShopId(employee: AuthenticatedEmployee): string {
  if (!employee.pinnedTo) {
    throw new ForbiddenException('Сотрудник не привязан к магазину');
  }
  return employee.pinnedTo;
}
import { CommonListQueryOptions } from 'src/common/types/queries';
import { PaginatedResponseDto, transformPaginatedResult, PaginationQueryDto } from 'src/interface/http/shared';
import { 
  INVENTORY_PROCESS_ORCHESTRATOR, 
  InventoryProcessOrchestrator,
} from 'src/processes/inventory';
import { WriteOffPort, WRITE_OFF_PORT, WriteOffQueries } from 'src/modules/write-off';
import { ReceivingPort, RECEIVING_PORT, ReceivingQueries } from 'src/modules/receiving';
import { TransferPort, TRANSFER_PORT, TransferQueries } from 'src/modules/transfer';
import { InventoryAuditPort, INVENTORY_AUDIT_PORT, InventoryAuditQueries, InventoryAuditCommands } from 'src/modules/inventory-audit';
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


@Injectable()
export class ShopInventoryRoleService {
  constructor(
    @Inject(INVENTORY_PROCESS_ORCHESTRATOR) 
    private readonly inventoryOrchestrator: InventoryProcessOrchestrator,
    @Inject(WRITE_OFF_PORT) private readonly writeOffPort: WriteOffPort,
    @Inject(RECEIVING_PORT) private readonly receivingPort: ReceivingPort,
    @Inject(TRANSFER_PORT) private readonly transferPort: TransferPort,
    @Inject(INVENTORY_AUDIT_PORT) private readonly inventoryAuditPort: InventoryAuditPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // WRITE-OFF
  // ═══════════════════════════════════════════════════════════════

  async getWriteOffs(
    authedEmployee: AuthenticatedEmployee,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WriteOffResponseDto>> {
    try {
      const query = new WriteOffQueries.GetWriteOffsQuery({
        shopId: getShopId(authedEmployee),
      });

      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery,
        sort: { createdAt: -1 },
      };

      const result = await this.writeOffPort.getWriteOffs(query, queryOptions);
      return transformPaginatedResult(result, WriteOffResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async getWriteOff(
    authedEmployee: AuthenticatedEmployee,
    writeOffId: string,
  ): Promise<WriteOffResponseDto> {
    try {
      const writeOff = await this.writeOffPort.getWriteOff(
        new WriteOffQueries.GetWriteOffQuery(writeOffId, { populateItems: true })
      );

      if (!writeOff || writeOff.shop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ списания не найден');
      }

      return plainToInstance(WriteOffResponseDto, writeOff, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async createWriteOff(
    authedEmployee: AuthenticatedEmployee,
    dto: CreateWriteOffDto,
  ): Promise<WriteOffResponseDto> {
    try {
      const writeOff = await this.inventoryOrchestrator.createWriteOff({
        shopId: getShopId(authedEmployee),
        reason: dto.reason,
        items: dto.items,
        comment: dto.comment,
        employeeId: authedEmployee.id,
        employeeName: authedEmployee.employeeName,
      });

      return plainToInstance(WriteOffResponseDto, writeOff, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.VALIDATION]: new NotFoundException('Ошибка валидации'),
      });
    }
  }

  async confirmWriteOff(
    authedEmployee: AuthenticatedEmployee,
    writeOffId: string,
  ): Promise<ConfirmWriteOffResultDto> {
    try {
      // Проверяем что документ принадлежит магазину
      const writeOff = await this.writeOffPort.getWriteOff(
        new WriteOffQueries.GetWriteOffQuery(writeOffId)
      );
      if (!writeOff || writeOff.shop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ списания не найден');
      }

      const result = await this.inventoryOrchestrator.confirmWriteOff({
        writeOffId,
        employeeId: authedEmployee.id,
        employeeName: authedEmployee.employeeName,
      });

      return plainToInstance(ConfirmWriteOffResultDto, result, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
        [DomainErrorCode.INVARIANT]: new NotFoundException('Невозможно подтвердить документ'),
        [DomainErrorCode.VALIDATION]: new NotFoundException('Недостаточно остатков для списания'),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RECEIVING
  // ═══════════════════════════════════════════════════════════════

  async getReceivings(
    authedEmployee: AuthenticatedEmployee,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ReceivingResponseDto>> {
    try {
      const query = new ReceivingQueries.GetReceivingsQuery({
        shopId: getShopId(authedEmployee),
      });

      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery,
        sort: { createdAt: -1 },
      };

      const result = await this.receivingPort.getReceivings(query, queryOptions);
      return transformPaginatedResult(result, ReceivingResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async getReceiving(
    authedEmployee: AuthenticatedEmployee,
    receivingId: string,
  ): Promise<ReceivingResponseDto> {
    try {
      const receiving = await this.receivingPort.getReceiving(
        new ReceivingQueries.GetReceivingQuery(receivingId, { populateItems: true })
      );

      if (!receiving || receiving.shop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ приёмки не найден');
      }

      return plainToInstance(ReceivingResponseDto, receiving, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async createReceiving(
    authedEmployee: AuthenticatedEmployee,
    dto: CreateReceivingDto,
  ): Promise<ReceivingResponseDto> {
    try {
      const receiving = await this.inventoryOrchestrator.createReceiving({
        shopId: getShopId(authedEmployee),
        type: dto.type,
        items: dto.items,
        supplier: dto.supplier,
        supplierInvoice: dto.supplierInvoice,
        comment: dto.comment,
        employeeId: authedEmployee.id,
        employeeName: authedEmployee.employeeName,
      });

      return plainToInstance(ReceivingResponseDto, receiving, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.VALIDATION]: new NotFoundException('Ошибка валидации'),
      });
    }
  }

  async confirmReceiving(
    authedEmployee: AuthenticatedEmployee,
    receivingId: string,
    dto: ConfirmReceivingDto,
  ): Promise<ConfirmReceivingResultDto> {
    try {
      // Проверяем что документ принадлежит магазину
      const receiving = await this.receivingPort.getReceiving(
        new ReceivingQueries.GetReceivingQuery(receivingId)
      );
      if (!receiving || receiving.shop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ приёмки не найден');
      }

      const result = await this.inventoryOrchestrator.confirmReceiving({
        receivingId,
        actualItems: dto.actualItems,
        employeeId: authedEmployee.id,
        employeeName: authedEmployee.employeeName,
      });

      return plainToInstance(ConfirmReceivingResultDto, result, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
        [DomainErrorCode.INVARIANT]: new NotFoundException('Невозможно подтвердить документ'),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER
  // ═══════════════════════════════════════════════════════════════

  async getOutgoingTransfers(
    authedEmployee: AuthenticatedEmployee,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TransferResponseDto>> {
    try {
      const query = new TransferQueries.GetTransfersQuery({
        sourceShopId: getShopId(authedEmployee),
      });

      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery,
        sort: { createdAt: -1 },
      };

      const result = await this.transferPort.getTransfers(query, queryOptions);
      return transformPaginatedResult(result, TransferResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async getIncomingTransfers(
    authedEmployee: AuthenticatedEmployee,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<TransferResponseDto>> {
    try {
      const query = new TransferQueries.GetTransfersQuery({
        targetShopId: getShopId(authedEmployee),
      });

      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery,
        sort: { createdAt: -1 },
      };

      const result = await this.transferPort.getTransfers(query, queryOptions);
      return transformPaginatedResult(result, TransferResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async getTransfer(
    authedEmployee: AuthenticatedEmployee,
    transferId: string,
  ): Promise<TransferResponseDto> {
    try {
      const transfer = await this.transferPort.getTransfer(
        new TransferQueries.GetTransferQuery(transferId)
      );

      const shopId = getShopId(authedEmployee);
      if (!transfer || (transfer.sourceShop.toString() !== shopId && transfer.targetShop.toString() !== shopId)) {
        throw new NotFoundException('Документ перемещения не найден');
      }

      return plainToInstance(TransferResponseDto, transfer, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async createTransfer(
    authedEmployee: AuthenticatedEmployee,
    dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    try {
      const transfer = await this.inventoryOrchestrator.createTransfer({
        sourceShopId: getShopId(authedEmployee),
        targetShopId: dto.targetShopId,
        items: dto.items,
        comment: dto.comment,
        employeeId: authedEmployee.id,
        employeeName: authedEmployee.employeeName,
      });

      return plainToInstance(TransferResponseDto, transfer, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.VALIDATION]: new NotFoundException('Ошибка валидации'),
      });
    }
  }

  async sendTransfer(
    authedEmployee: AuthenticatedEmployee,
    transferId: string,
  ): Promise<SendTransferResultDto> {
    try {
      const transfer = await this.transferPort.getTransfer(
        new TransferQueries.GetTransferQuery(transferId)
      );
      if (!transfer || transfer.sourceShop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ перемещения не найден');
      }

      const result = await this.inventoryOrchestrator.sendTransfer({
        transferId,
        employeeId: authedEmployee.id,
        employeeName: authedEmployee.employeeName,
      });

      return plainToInstance(SendTransferResultDto, result, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
        [DomainErrorCode.INVARIANT]: new NotFoundException('Невозможно отправить'),
        [DomainErrorCode.VALIDATION]: new NotFoundException('Недостаточно остатков'),
      });
    }
  }

  async receiveTransfer(
    authedEmployee: AuthenticatedEmployee,
    transferId: string,
  ): Promise<ReceiveTransferResultDto> {
    try {
      const transfer = await this.transferPort.getTransfer(
        new TransferQueries.GetTransferQuery(transferId)
      );
      if (!transfer || transfer.targetShop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ перемещения не найден');
      }

      const result = await this.inventoryOrchestrator.receiveTransfer({
        transferId,
        employeeId: authedEmployee.id,
        employeeName: authedEmployee.employeeName,
      });

      return plainToInstance(ReceiveTransferResultDto, result, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
        [DomainErrorCode.INVARIANT]: new NotFoundException('Невозможно принять'),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY AUDIT
  // ═══════════════════════════════════════════════════════════════

  async getInventoryAudits(
    authedEmployee: AuthenticatedEmployee,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<InventoryAuditResponseDto>> {
    try {
      const query = new InventoryAuditQueries.GetInventoryAuditsQuery({
        shopId: getShopId(authedEmployee),
      });

      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery,
        sort: { createdAt: -1 },
      };

      const result = await this.inventoryAuditPort.getInventoryAudits(query, queryOptions);
      return transformPaginatedResult(result, InventoryAuditResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async getInventoryAudit(
    authedEmployee: AuthenticatedEmployee,
    inventoryAuditId: string,
  ): Promise<InventoryAuditResponseDto> {
    try {
      const audit = await this.inventoryAuditPort.getInventoryAudit(
        new InventoryAuditQueries.GetInventoryAuditQuery(inventoryAuditId)
      );

      if (!audit || audit.shop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ инвентаризации не найден');
      }

      return plainToInstance(InventoryAuditResponseDto, audit, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
      });
    }
  }

  async createInventoryAudit(
    authedEmployee: AuthenticatedEmployee,
    dto: CreateInventoryAuditDto,
  ): Promise<InventoryAuditResponseDto> {
    try {
      const audit = await this.inventoryOrchestrator.createInventoryAudit({
        shopId: getShopId(authedEmployee),
        type: dto.type,
        shopProductIds: dto.shopProductIds,
        comment: dto.comment,
        employeeId: authedEmployee.id,
      });

      return plainToInstance(InventoryAuditResponseDto, audit, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.INVARIANT]: new NotFoundException('Уже есть активная инвентаризация'),
      });
    }
  }

  async startInventoryAudit(
    authedEmployee: AuthenticatedEmployee,
    inventoryAuditId: string,
  ): Promise<InventoryAuditResponseDto> {
    try {
      const audit = await this.inventoryAuditPort.getInventoryAudit(
        new InventoryAuditQueries.GetInventoryAuditQuery(inventoryAuditId)
      );
      if (!audit || audit.shop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ инвентаризации не найден');
      }

      const result = await this.inventoryAuditPort.startInventoryAudit(
        new InventoryAuditCommands.StartInventoryAuditCommand(inventoryAuditId, {
          startedById: authedEmployee.id,
        })
      );

      return plainToInstance(InventoryAuditResponseDto, result, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
        [DomainErrorCode.INVARIANT]: new NotFoundException('Невозможно начать'),
      });
    }
  }

  async updateItemCounts(
    authedEmployee: AuthenticatedEmployee,
    inventoryAuditId: string,
    dto: BulkUpdateItemCountsDto,
  ): Promise<InventoryAuditResponseDto> {
    try {
      const audit = await this.inventoryAuditPort.getInventoryAudit(
        new InventoryAuditQueries.GetInventoryAuditQuery(inventoryAuditId)
      );
      if (!audit || audit.shop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ инвентаризации не найден');
      }

      const result = await this.inventoryAuditPort.bulkUpdateItemCounts(
        new InventoryAuditCommands.BulkUpdateItemCountsCommand(inventoryAuditId, dto.items)
      );

      return plainToInstance(InventoryAuditResponseDto, result, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ или позиция не найдены'),
        [DomainErrorCode.INVARIANT]: new NotFoundException('Невозможно обновить подсчёт'),
      });
    }
  }

  async completeInventoryAudit(
    authedEmployee: AuthenticatedEmployee,
    inventoryAuditId: string,
    dto: CompleteInventoryAuditDto,
  ): Promise<CompleteInventoryAuditResultDto> {
    try {
      const audit = await this.inventoryAuditPort.getInventoryAudit(
        new InventoryAuditQueries.GetInventoryAuditQuery(inventoryAuditId)
      );
      if (!audit || audit.shop.toString() !== getShopId(authedEmployee)) {
        throw new NotFoundException('Документ инвентаризации не найден');
      }

      const result = await this.inventoryOrchestrator.completeInventoryAudit({
        inventoryAuditId,
        applyResults: dto.applyResults,
        employeeId: authedEmployee.id,
        employeeName: authedEmployee.employeeName,
      });

      return plainToInstance(CompleteInventoryAuditResultDto, result, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Документ не найден'),
        [DomainErrorCode.INVARIANT]: new NotFoundException('Невозможно завершить'),
      });
    }
  }
}
