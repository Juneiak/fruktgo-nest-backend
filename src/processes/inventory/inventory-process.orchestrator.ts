import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainError } from 'src/common/errors';

// Domain Modules
import { ShopProductPort, SHOP_PRODUCT_PORT, ShopProductQueries, ShopProductCommands } from 'src/modules/shop-product';
import { 
  WriteOffPort, 
  WRITE_OFF_PORT, 
  WriteOffQueries, 
  WriteOffCommands,
  WriteOff,
} from 'src/modules/write-off';
import { 
  ReceivingPort, 
  RECEIVING_PORT, 
  ReceivingQueries, 
  ReceivingCommands,
  Receiving,
} from 'src/modules/receiving';
import { 
  TransferPort, 
  TRANSFER_PORT, 
  TransferQueries, 
  TransferCommands,
  Transfer,
} from 'src/modules/transfer';
import { 
  InventoryAuditPort, 
  INVENTORY_AUDIT_PORT, 
  InventoryAuditQueries, 
  InventoryAuditCommands,
  InventoryAudit,
} from 'src/modules/inventory-audit';
import { 
  StockMovementPort, 
  STOCK_MOVEMENT_PORT, 
  StockMovementCommands,
  StockMovementType,
  StockMovementDocumentType,
  StockMovementActorType,
} from 'src/modules/stock-movement';

// Process types
import {
  CreateWriteOffInput,
  ConfirmWriteOffInput,
  ConfirmWriteOffResult,
  CreateReceivingInput,
  ConfirmReceivingInput,
  ConfirmReceivingResult,
  CreateTransferInput,
  SendTransferInput,
  SendTransferResult,
  ReceiveTransferInput,
  ReceiveTransferResult,
  CreateInventoryAuditInput,
  CompleteInventoryAuditInput,
  CompleteInventoryAuditResult,
} from './inventory-process.types';


@Injectable()
export class InventoryProcessOrchestrator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(WRITE_OFF_PORT) private readonly writeOffPort: WriteOffPort,
    @Inject(RECEIVING_PORT) private readonly receivingPort: ReceivingPort,
    @Inject(TRANSFER_PORT) private readonly transferPort: TransferPort,
    @Inject(INVENTORY_AUDIT_PORT) private readonly inventoryAuditPort: InventoryAuditPort,
    @Inject(SHOP_PRODUCT_PORT) private readonly shopProductPort: ShopProductPort,
    @Inject(STOCK_MOVEMENT_PORT) private readonly stockMovementPort: StockMovementPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // WRITE-OFF - Списание товара
  // ═══════════════════════════════════════════════════════════════

  /**
   * Создать документ списания (черновик)
   */
  async createWriteOff(input: CreateWriteOffInput): Promise<WriteOff> {
    const writeOff = await this.writeOffPort.createWriteOff(
      new WriteOffCommands.CreateWriteOffCommand({
        shopId: input.shopId,
        reason: input.reason,
        items: input.items,
        comment: input.comment,
        createdById: input.employeeId,
      })
    );

    this.eventEmitter.emit('inventory.writeoff.created', {
      writeOffId: writeOff._id.toString(),
      shopId: input.shopId,
      employeeId: input.employeeId,
    });

    return writeOff;
  }

  /**
   * Подтвердить списание - списывает остатки и записывает движения
   */
  async confirmWriteOff(input: ConfirmWriteOffInput): Promise<ConfirmWriteOffResult> {
    const session = await this.connection.startSession();
    
    try {
      let result: ConfirmWriteOffResult | null = null;

      await session.withTransaction(async () => {
        // 1. Получаем документ списания
        const writeOff = await this.writeOffPort.getWriteOff(
          new WriteOffQueries.GetWriteOffQuery(input.writeOffId, { populateItems: true })
        );

        if (!writeOff) {
          throw DomainError.notFound('WriteOff', input.writeOffId);
        }

        // 2. Получаем текущие остатки товаров
        const shopProductIds = writeOff.items.map(i => i.shopProduct.toString());
        const shopProducts = await this.shopProductPort.getShopProductsByIds(
          new ShopProductQueries.GetShopProductsByIdsQuery(shopProductIds),
          { session }
        );
        const productMap = new Map(shopProducts.map(sp => [sp._id.toString(), sp]));

        // 3. Проверяем достаточность остатков
        for (const item of writeOff.items) {
          const shopProduct = productMap.get(item.shopProduct.toString());
          if (!shopProduct) {
            throw DomainError.notFound('ShopProduct', item.shopProduct.toString());
          }
          if (shopProduct.stockQuantity < item.quantity) {
            throw DomainError.validation(
              `Недостаточно остатков для списания товара`,
              { 
                shopProductId: item.shopProduct.toString(),
                available: shopProduct.stockQuantity,
                requested: item.quantity,
              }
            );
          }
        }

        // 4. Подтверждаем документ
        await this.writeOffPort.confirmWriteOff(
          new WriteOffCommands.ConfirmWriteOffCommand(input.writeOffId, {
            confirmedById: input.employeeId,
          }),
          { session }
        );

        // 5. Списываем остатки
        const stockAdjustments = writeOff.items.map(item => ({
          shopProductId: item.shopProduct.toString(),
          adjustment: -item.quantity, // Отрицательное значение для списания
        }));

        await this.shopProductPort.bulkAdjustStockQuantity(
          new ShopProductCommands.BulkAdjustStockQuantityCommand(stockAdjustments),
          { session }
        );

        // 6. Записываем движения товаров
        const stockMovements = writeOff.items.map(item => {
          const shopProduct = productMap.get(item.shopProduct.toString());
          const balanceBefore = shopProduct?.stockQuantity || 0;
          const balanceAfter = balanceBefore - item.quantity;
          
          return {
            type: StockMovementType.WRITE_OFF,
            shopProductId: item.shopProduct.toString(),
            shopId: writeOff.shop.toString(),
            quantity: -item.quantity,
            balanceBefore,
            balanceAfter,
            actor: {
              type: StockMovementActorType.EMPLOYEE,
              id: input.employeeId,
              name: input.employeeName,
            },
            document: {
              type: StockMovementDocumentType.WRITE_OFF,
              id: writeOff._id.toString(),
              number: writeOff.documentNumber,
            },
            writeOffReason: item.reason,
            comment: item.comment,
          };
        });

        await this.stockMovementPort.bulkCreateStockMovements(
          new StockMovementCommands.BulkCreateStockMovementsCommand(stockMovements),
          { session }
        );

        result = {
          writeOffId: writeOff._id.toString(),
          documentNumber: writeOff.documentNumber,
          totalItemsWrittenOff: writeOff.items.reduce((sum, i) => sum + i.quantity, 0),
        };
      });

      this.eventEmitter.emit('inventory.writeoff.confirmed', {
        writeOffId: input.writeOffId,
        employeeId: input.employeeId,
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RECEIVING - Приёмка товара
  // ═══════════════════════════════════════════════════════════════

  /**
   * Создать документ приёмки (черновик)
   */
  async createReceiving(input: CreateReceivingInput): Promise<Receiving> {
    const receiving = await this.receivingPort.createReceiving(
      new ReceivingCommands.CreateReceivingCommand({
        shopId: input.shopId,
        type: input.type,
        items: input.items,
        supplier: input.supplier,
        supplierInvoice: input.supplierInvoice,
        comment: input.comment,
        createdById: input.employeeId,
      })
    );

    this.eventEmitter.emit('inventory.receiving.created', {
      receivingId: receiving._id.toString(),
      shopId: input.shopId,
      employeeId: input.employeeId,
    });

    return receiving;
  }

  /**
   * Подтвердить приёмку - добавляет остатки и записывает движения
   */
  async confirmReceiving(input: ConfirmReceivingInput): Promise<ConfirmReceivingResult> {
    const session = await this.connection.startSession();
    
    try {
      let result: ConfirmReceivingResult | null = null;

      await session.withTransaction(async () => {
        // 1. Получаем документ приёмки
        const receiving = await this.receivingPort.getReceiving(
          new ReceivingQueries.GetReceivingQuery(input.receivingId, { populateItems: true })
        );

        if (!receiving) {
          throw DomainError.notFound('Receiving', input.receivingId);
        }

        // 2. Получаем текущие остатки товаров
        const shopProductIds = receiving.items.map(i => i.shopProduct.toString());
        const shopProducts = await this.shopProductPort.getShopProductsByIds(
          new ShopProductQueries.GetShopProductsByIdsQuery(shopProductIds),
          { session }
        );
        const productMap = new Map(shopProducts.map(sp => [sp._id.toString(), sp]));

        // 3. Подтверждаем документ с фактическими количествами
        const confirmedReceiving = await this.receivingPort.confirmReceiving(
          new ReceivingCommands.ConfirmReceivingCommand(input.receivingId, {
            confirmedById: input.employeeId,
            actualItems: input.actualItems,
          }),
          { session }
        );

        // 4. Добавляем остатки (используем actualQuantity)
        const stockAdjustments = input.actualItems
          .filter(item => item.actualQuantity > 0)
          .map(item => ({
            shopProductId: item.shopProductId,
            adjustment: item.actualQuantity, // Положительное значение для приёмки
          }));

        if (stockAdjustments.length > 0) {
          await this.shopProductPort.bulkAdjustStockQuantity(
            new ShopProductCommands.BulkAdjustStockQuantityCommand(stockAdjustments),
            { session }
          );
        }

        // 5. Записываем движения товаров
        const stockMovements = input.actualItems
          .filter(item => item.actualQuantity > 0)
          .map(item => {
            const shopProduct = productMap.get(item.shopProductId);
            const balanceBefore = shopProduct?.stockQuantity || 0;
            const balanceAfter = balanceBefore + item.actualQuantity;
            
            return {
              type: StockMovementType.RECEIVING,
              shopProductId: item.shopProductId,
              shopId: receiving.shop.toString(),
              quantity: item.actualQuantity,
              balanceBefore,
              balanceAfter,
              actor: {
                type: StockMovementActorType.EMPLOYEE,
                id: input.employeeId,
                name: input.employeeName,
              },
              document: {
                type: StockMovementDocumentType.RECEIVING,
                id: receiving._id.toString(),
                number: receiving.documentNumber,
              },
              comment: `Приёмка: ${receiving.type}${receiving.supplier ? ` от ${receiving.supplier}` : ''}`,
            };
          });

        if (stockMovements.length > 0) {
          await this.stockMovementPort.bulkCreateStockMovements(
            new StockMovementCommands.BulkCreateStockMovementsCommand(stockMovements),
            { session }
          );
        }

        result = {
          receivingId: receiving._id.toString(),
          documentNumber: receiving.documentNumber,
          totalItemsReceived: input.actualItems.reduce((sum, i) => sum + i.actualQuantity, 0),
        };
      });

      this.eventEmitter.emit('inventory.receiving.confirmed', {
        receivingId: input.receivingId,
        employeeId: input.employeeId,
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSFER - Перемещение между магазинами
  // ═══════════════════════════════════════════════════════════════

  /**
   * Создать документ перемещения (черновик)
   */
  async createTransfer(input: CreateTransferInput): Promise<Transfer> {
    const transfer = await this.transferPort.createTransfer(
      new TransferCommands.CreateTransferCommand({
        sourceShopId: input.sourceShopId,
        targetShopId: input.targetShopId,
        items: input.items,
        comment: input.comment,
        createdById: input.employeeId,
      })
    );

    this.eventEmitter.emit('inventory.transfer.created', {
      transferId: transfer._id.toString(),
      sourceShopId: input.sourceShopId,
      targetShopId: input.targetShopId,
      employeeId: input.employeeId,
    });

    return transfer;
  }

  /**
   * Отправить перемещение - списывает остатки с отправителя
   */
  async sendTransfer(input: SendTransferInput): Promise<SendTransferResult> {
    const session = await this.connection.startSession();
    
    try {
      let result: SendTransferResult | null = null;

      await session.withTransaction(async () => {
        // 1. Получаем документ перемещения
        const transfer = await this.transferPort.getTransfer(
          new TransferQueries.GetTransferQuery(input.transferId)
        );

        if (!transfer) {
          throw DomainError.notFound('Transfer', input.transferId);
        }

        // 2. Получаем текущие остатки товаров
        const shopProductIds = transfer.items.map(i => i.shopProduct.toString());
        const shopProducts = await this.shopProductPort.getShopProductsByIds(
          new ShopProductQueries.GetShopProductsByIdsQuery(shopProductIds),
          { session }
        );
        const productMap = new Map(shopProducts.map(sp => [sp._id.toString(), sp]));

        // 3. Проверяем достаточность остатков
        for (const item of transfer.items) {
          const shopProduct = productMap.get(item.shopProduct.toString());
          if (!shopProduct) {
            throw DomainError.notFound('ShopProduct', item.shopProduct.toString());
          }
          if (shopProduct.stockQuantity < item.quantity) {
            throw DomainError.validation(
              `Недостаточно остатков для перемещения товара`,
              { 
                shopProductId: item.shopProduct.toString(),
                available: shopProduct.stockQuantity,
                requested: item.quantity,
              }
            );
          }
        }

        // 4. Отправляем документ
        await this.transferPort.sendTransfer(
          new TransferCommands.SendTransferCommand(input.transferId, {
            sentById: input.employeeId,
          }),
          { session }
        );

        // 5. Списываем остатки с отправителя
        const stockAdjustments = transfer.items.map(item => ({
          shopProductId: item.shopProduct.toString(),
          adjustment: -item.quantity,
        }));

        await this.shopProductPort.bulkAdjustStockQuantity(
          new ShopProductCommands.BulkAdjustStockQuantityCommand(stockAdjustments),
          { session }
        );

        // 6. Записываем движения товаров
        const stockMovements = transfer.items.map(item => {
          const shopProduct = productMap.get(item.shopProduct.toString());
          const balanceBefore = shopProduct?.stockQuantity || 0;
          const balanceAfter = balanceBefore - item.quantity;
          
          return {
            type: StockMovementType.TRANSFER,
            shopProductId: item.shopProduct.toString(),
            shopId: transfer.sourceShop.toString(),
            quantity: -item.quantity,
            balanceBefore,
            balanceAfter,
            actor: {
              type: StockMovementActorType.EMPLOYEE,
              id: input.employeeId,
              name: input.employeeName,
            },
            document: {
              type: StockMovementDocumentType.TRANSFER,
              id: transfer._id.toString(),
              number: transfer.documentNumber,
            },
            comment: `Отправлено в магазин`,
          };
        });

        await this.stockMovementPort.bulkCreateStockMovements(
          new StockMovementCommands.BulkCreateStockMovementsCommand(stockMovements),
          { session }
        );

        result = {
          transferId: transfer._id.toString(),
          documentNumber: transfer.documentNumber,
          totalItemsSent: transfer.items.reduce((sum, i) => sum + i.quantity, 0),
        };
      });

      this.eventEmitter.emit('inventory.transfer.sent', {
        transferId: input.transferId,
        employeeId: input.employeeId,
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Принять перемещение - добавляет остатки получателю
   */
  async receiveTransfer(input: ReceiveTransferInput): Promise<ReceiveTransferResult> {
    const session = await this.connection.startSession();
    
    try {
      let result: ReceiveTransferResult | null = null;

      await session.withTransaction(async () => {
        // 1. Получаем документ перемещения
        const transfer = await this.transferPort.getTransfer(
          new TransferQueries.GetTransferQuery(input.transferId)
        );

        if (!transfer) {
          throw DomainError.notFound('Transfer', input.transferId);
        }

        // 2. Получаем или создаём ShopProduct в целевом магазине
        // NOTE: Для перемещения предполагаем, что товары уже существуют
        const shopProductIds = transfer.items.map(i => i.shopProduct.toString());
        const shopProducts = await this.shopProductPort.getShopProductsByIds(
          new ShopProductQueries.GetShopProductsByIdsQuery(shopProductIds),
          { session }
        );
        const productMap = new Map(shopProducts.map(sp => [sp._id.toString(), sp]));

        // 3. Принимаем документ
        await this.transferPort.receiveTransfer(
          new TransferCommands.ReceiveTransferCommand(input.transferId, {
            receivedById: input.employeeId,
          }),
          { session }
        );

        // 4. Добавляем остатки получателю
        const stockAdjustments = transfer.items.map(item => ({
          shopProductId: item.shopProduct.toString(),
          adjustment: item.quantity,
        }));

        await this.shopProductPort.bulkAdjustStockQuantity(
          new ShopProductCommands.BulkAdjustStockQuantityCommand(stockAdjustments),
          { session }
        );

        // 5. Записываем движения товаров
        const stockMovements = transfer.items.map(item => {
          const shopProduct = productMap.get(item.shopProduct.toString());
          const balanceBefore = shopProduct?.stockQuantity || 0;
          const balanceAfter = balanceBefore + item.quantity;
          
          return {
            type: StockMovementType.RECEIVING,
            shopProductId: item.shopProduct.toString(),
            shopId: transfer.targetShop.toString(),
            quantity: item.quantity,
            balanceBefore,
            balanceAfter,
            actor: {
              type: StockMovementActorType.EMPLOYEE,
              id: input.employeeId,
              name: input.employeeName,
            },
            document: {
              type: StockMovementDocumentType.TRANSFER,
              id: transfer._id.toString(),
              number: transfer.documentNumber,
            },
            comment: `Получено перемещение`,
          };
        });

        await this.stockMovementPort.bulkCreateStockMovements(
          new StockMovementCommands.BulkCreateStockMovementsCommand(stockMovements),
          { session }
        );

        result = {
          transferId: transfer._id.toString(),
          documentNumber: transfer.documentNumber,
          totalItemsReceived: transfer.items.reduce((sum, i) => sum + i.quantity, 0),
        };
      });

      this.eventEmitter.emit('inventory.transfer.received', {
        transferId: input.transferId,
        employeeId: input.employeeId,
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY AUDIT - Инвентаризация
  // ═══════════════════════════════════════════════════════════════

  /**
   * Создать документ инвентаризации
   */
  async createInventoryAudit(input: CreateInventoryAuditInput): Promise<InventoryAudit> {
    const audit = await this.inventoryAuditPort.createInventoryAudit(
      new InventoryAuditCommands.CreateInventoryAuditCommand({
        shopId: input.shopId,
        type: input.type,
        shopProductIds: input.shopProductIds,
        comment: input.comment,
        createdById: input.employeeId,
      })
    );

    this.eventEmitter.emit('inventory.audit.created', {
      inventoryAuditId: audit._id.toString(),
      shopId: input.shopId,
      type: input.type,
      employeeId: input.employeeId,
    });

    return audit;
  }

  /**
   * Завершить инвентаризацию и применить результаты к остаткам
   */
  async completeInventoryAudit(input: CompleteInventoryAuditInput): Promise<CompleteInventoryAuditResult> {
    const session = await this.connection.startSession();
    
    try {
      let result: CompleteInventoryAuditResult | null = null;

      await session.withTransaction(async () => {
        // 1. Получаем документ инвентаризации
        const audit = await this.inventoryAuditPort.getInventoryAudit(
          new InventoryAuditQueries.GetInventoryAuditQuery(input.inventoryAuditId)
        );

        if (!audit) {
          throw DomainError.notFound('InventoryAudit', input.inventoryAuditId);
        }

        // 2. Завершаем документ
        const completedAudit = await this.inventoryAuditPort.completeInventoryAudit(
          new InventoryAuditCommands.CompleteInventoryAuditCommand(input.inventoryAuditId, {
            completedById: input.employeeId,
            applyResults: input.applyResults,
          }),
          { session }
        );

        // 3. Применяем результаты к остаткам (если applyResults = true)
        if (input.applyResults) {
          const adjustments: Array<{ shopProductId: string; adjustment: number }> = [];
          const movements: any[] = [];

          for (const item of audit.items) {
            if (item.isCounted && item.difference !== undefined && item.difference !== 0) {
              adjustments.push({
                shopProductId: item.shopProduct.toString(),
                adjustment: item.difference,
              });

              movements.push({
                type: item.difference > 0 ? StockMovementType.RECEIVING : StockMovementType.WRITE_OFF,
                shopProductId: item.shopProduct.toString(),
                shopId: audit.shop.toString(),
                quantity: item.difference,
                balanceBefore: item.expectedQuantity,
                balanceAfter: item.actualQuantity,
                actor: {
                  type: StockMovementActorType.EMPLOYEE,
                  id: input.employeeId,
                  name: input.employeeName,
                },
                document: {
                  type: StockMovementDocumentType.INVENTORY,
                  id: audit._id.toString(),
                  number: audit.documentNumber,
                },
                comment: item.difference > 0 
                  ? `Излишек при инвентаризации` 
                  : `Недостача при инвентаризации`,
              });
            }
          }

          if (adjustments.length > 0) {
            await this.shopProductPort.bulkAdjustStockQuantity(
              new ShopProductCommands.BulkAdjustStockQuantityCommand(adjustments),
              { session }
            );
          }

          if (movements.length > 0) {
            await this.stockMovementPort.bulkCreateStockMovements(
              new StockMovementCommands.BulkCreateStockMovementsCommand(movements),
              { session }
            );
          }
        }

        result = {
          inventoryAuditId: audit._id.toString(),
          documentNumber: audit.documentNumber,
          totalItems: completedAudit.totalItems,
          surplusItems: completedAudit.surplusItems,
          shortageItems: completedAudit.shortageItems,
          matchedItems: completedAudit.matchedItems,
        };
      });

      this.eventEmitter.emit('inventory.audit.completed', {
        inventoryAuditId: input.inventoryAuditId,
        employeeId: input.employeeId,
        applied: input.applyResults,
      });

      return result!;
    } finally {
      await session.endSession();
    }
  }
}
