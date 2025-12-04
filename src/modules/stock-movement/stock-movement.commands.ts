import { 
  StockMovementType, 
  StockMovementDocumentType, 
  StockMovementActorType,
  WriteOffReason,
} from './stock-movement.enums';

/**
 * Создание записи движения товара
 */
export class CreateStockMovementCommand {
  constructor(
    public readonly payload: {
      type: StockMovementType;
      shopProductId: string;
      shopId: string;
      quantity: number;
      balanceBefore: number;
      balanceAfter: number;
      actor: {
        type: StockMovementActorType;
        id?: string;
        name?: string;
      };
      document?: {
        type: StockMovementDocumentType;
        id: string;
        number?: string;
      };
      writeOffReason?: WriteOffReason;
      comment?: string;
    },
    public readonly stockMovementId?: string,
  ) {}
}

/**
 * Массовое создание записей движения (для заказов с несколькими товарами)
 */
export class BulkCreateStockMovementsCommand {
  constructor(
    public readonly items: Array<{
      type: StockMovementType;
      shopProductId: string;
      shopId: string;
      quantity: number;
      balanceBefore: number;
      balanceAfter: number;
      actor: {
        type: StockMovementActorType;
        id?: string;
        name?: string;
      };
      document?: {
        type: StockMovementDocumentType;
        id: string;
        number?: string;
      };
      writeOffReason?: WriteOffReason;
      comment?: string;
    }>,
  ) {}
}
