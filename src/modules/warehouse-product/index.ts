// Module
export { WarehouseProductModule } from './warehouse-product.module';

// Schema
export { WarehouseProduct, WarehouseProductSchema, WarehouseProductDocument, WarehouseProductModel } from './warehouse-product.schema';

// Port
export { WarehouseProductPort, WAREHOUSE_PRODUCT_PORT } from './warehouse-product.port';

// Enums
export { WarehouseProductStatus } from './warehouse-product.enums';

// Commands & Queries (namespace exports)
export * as WarehouseProductCommands from './warehouse-product.commands';
export * as WarehouseProductQueries from './warehouse-product.queries';
