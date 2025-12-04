import { WarehouseStatus } from './warehouse.enums';
import { WarehouseContact } from './warehouse.schema';

// ═══════════════════════════════════════════════════════════════
// ADDRESS DATA (для создания через AddressesPort)
// ═══════════════════════════════════════════════════════════════

export interface WarehouseAddressData {
  latitude: number;
  longitude: number;
  city: string;
  street: string;
  house: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  intercomCode?: string;
  label?: string;
}

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

export class CreateWarehouseCommand {
  constructor(
    public readonly data: {
      sellerId: string;
      name: string;
      address?: WarehouseAddressData;
      contact?: WarehouseContact;
      externalCode?: string;
      description?: string;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

export class UpdateWarehouseCommand {
  constructor(
    public readonly warehouseId: string,
    public readonly data: {
      name?: string;
      address?: Partial<WarehouseAddressData>;
      contact?: Partial<WarehouseContact>;
      externalCode?: string;
      description?: string;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════

export class UpdateWarehouseStatusCommand {
  constructor(
    public readonly warehouseId: string,
    public readonly status: WarehouseStatus,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════

export class DeleteWarehouseCommand {
  constructor(public readonly warehouseId: string) {}
}
