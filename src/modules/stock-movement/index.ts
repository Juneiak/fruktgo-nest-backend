// Module
export { StockMovementModule } from './stock-movement.module';

// Schema
export { 
  StockMovement, 
  StockMovementSchema, 
  StockMovementModel,
  StockMovementDocument as StockMovementDocumentEmbedded,
  StockMovementActor as StockMovementActorEmbedded,
} from './stock-movement.schema';

// Port
export { StockMovementPort, STOCK_MOVEMENT_PORT } from './stock-movement.port';

// Commands & Queries
export * as StockMovementCommands from './stock-movement.commands';
export * as StockMovementQueries from './stock-movement.queries';

// Enums
export * as StockMovementEnums from './stock-movement.enums';
export { 
  StockMovementType,
  StockMovementDocumentType,
  StockMovementActorType,
  WriteOffReason,
} from './stock-movement.enums';
