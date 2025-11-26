// application/customer.port.ts
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { Customer } from './customer.schema';
import { PaginateResult } from 'mongoose';
import {
  CreateCustomerCommand,
  UpdateCustomerCommand,
  BlockCustomerCommand,
  AddAddressCommand,
  DeleteAddressCommand,
  SelectAddressCommand,
} from './customer.commands';
import { GetCustomersQuery, GetCustomerQuery } from './customer.queries';

export interface CustomerPort {

  // ====================================================
  // QUERIES
  // ==================================================== 
  getCustomers(query: GetCustomersQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Customer>>;
  getCustomer(query: GetCustomerQuery, queryOptions?: CommonCommandOptions): Promise<Customer | null>;


  // ====================================================
  // COMMANDS
  // ==================================================== 
  createCustomer(command: CreateCustomerCommand, commandOptions?: CommonCommandOptions): Promise<Customer>;
  updateCustomer(command: UpdateCustomerCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  blockCustomer(command: BlockCustomerCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  addAddress(command: AddAddressCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  deleteAddress(command: DeleteAddressCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  selectAddress(command: SelectAddressCommand, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const CUSTOMER_PORT = Symbol('CUSTOMER_PORT');
