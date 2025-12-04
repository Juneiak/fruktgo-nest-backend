// Module
export { BatchStockModule } from './batch-stock.module';

// Schema
export { 
  BatchStock, 
  BatchStockSchema, 
  BatchStockDocument, 
  BatchStockModel 
} from './batch-stock.schema';

// Port
export { BatchStockPort, FifoConsumeResult, BATCH_STOCK_PORT } from './batch-stock.port';

// Enums
export { BatchStockLocationType, BatchStockStatus } from './batch-stock.enums';

// Commands & Queries (namespace exports)
export * as BatchStockCommands from './batch-stock.commands';
export * as BatchStockQueries from './batch-stock.queries';
