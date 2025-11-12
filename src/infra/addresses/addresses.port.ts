import { Address } from './address.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { 
  CreateAddressCommand, 
  UpdateAddressCommand,
  SetDefaultAddressCommand,
  DeleteAllEntityAddressesCommand 
} from './addresses.commands';
import { 
  GetEntityAddressesQuery,
  GetNearbyAddressesQuery 
} from './addresses.queries';

export interface AddressesPort {
  // ====================================================
  // QUERIES
  // ====================================================
  getAddress(addressId: string, queryOptions?: CommonQueryOptions): Promise<Address | null>;
  getEntityAddresses(query: GetEntityAddressesQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Address>>;
  getNearbyAddresses(query: GetNearbyAddressesQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Address>>;
  getDefaultAddress(entityType: string, entityId: string, queryOptions?: CommonQueryOptions): Promise<Address | null>;

  // ====================================================
  // COMMANDS
  // ====================================================
  createAddress(command: CreateAddressCommand, commandOptions?: CommonCommandOptions): Promise<Address>;
  updateAddress(command: UpdateAddressCommand, commandOptions?: CommonCommandOptions): Promise<Address>;
  setDefaultAddress(command: SetDefaultAddressCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  deleteAddress(addressId: string, commandOptions?: CommonCommandOptions): Promise<void>;
  deleteAllEntityAddresses(command: DeleteAllEntityAddressesCommand, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const ADDRESSES_PORT = Symbol('ADDRESSES_PORT');
