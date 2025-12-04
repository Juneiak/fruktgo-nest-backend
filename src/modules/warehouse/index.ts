// Module
export { WarehouseModule } from './warehouse.module';

// Schema
export { Warehouse, WarehouseSchema, WarehouseDocument, WarehouseModel, WarehouseContact } from './warehouse.schema';

// Port
export { WarehousePort, WAREHOUSE_PORT } from './warehouse.port';

// Enums
export { WarehouseStatus } from './warehouse.enums';

// Commands & Queries (namespace exports)
export * as WarehouseCommands from './warehouse.commands';
export * as WarehouseQueries from './warehouse.queries';
