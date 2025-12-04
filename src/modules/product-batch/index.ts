// Module
export { ProductBatchModule } from './product-batch.module';

// Schema
export { 
  ProductBatch, 
  ProductBatchSchema, 
  ProductBatchDocument, 
  ProductBatchModel 
} from './product-batch.schema';

// Port
export { ProductBatchPort, BatchStatistics, PRODUCT_BATCH_PORT } from './product-batch.port';

// Enums
export { ProductBatchStatus, ExpirationAlertLevel } from './product-batch.enums';

// Commands & Queries (namespace exports)
export * as ProductBatchCommands from './product-batch.commands';
export * as ProductBatchQueries from './product-batch.queries';
