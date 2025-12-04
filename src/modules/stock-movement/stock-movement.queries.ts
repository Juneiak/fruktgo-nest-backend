import { StockMovementType, StockMovementDocumentType } from './stock-movement.enums';

/**
 * Получение одной записи движения
 */
export class GetStockMovementQuery {
  constructor(
    public readonly stockMovementId: string,
  ) {}
}

/**
 * Получение списка движений с фильтрами
 */
export class GetStockMovementsQuery {
  constructor(
    public readonly filters: {
      shopProductId?: string;
      shopId?: string;
      types?: StockMovementType[];
      documentType?: StockMovementDocumentType;
      documentId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {}
}

/**
 * Получение движений по документу (например, все движения по заказу)
 */
export class GetMovementsByDocumentQuery {
  constructor(
    public readonly documentType: StockMovementDocumentType,
    public readonly documentId: string,
  ) {}
}
