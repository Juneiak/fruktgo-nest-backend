// application/customer.port.ts
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { Customer } from './customer.schema';
import { PaginateResult } from 'mongoose';
import {
  CreateCustomerCommand,
  UpdateCustomerCommand,
  BlockCustomerCommand,
  AddAddressCommand,
  DeleteAddressCommand,
  SelectAddressCommand
} from './customer.commands';

export interface CustomerPort {

  // ====================================================
  // COMMANDS
  // ==================================================== 
  createCustomer(command: CreateCustomerCommand, options: CommonCommandOptions): Promise<Customer>;
  updateCustomer(command: UpdateCustomerCommand, options: CommonCommandOptions): Promise<void>;
  blockCustomer(command: BlockCustomerCommand, options: CommonCommandOptions): Promise<void>;
  addAddress(command: AddAddressCommand, options: CommonCommandOptions): Promise<void>;
  deleteAddress(command: DeleteAddressCommand, options: CommonCommandOptions): Promise<void>;
  selectAddress(command: SelectAddressCommand, options: CommonCommandOptions): Promise<void>;

  // ====================================================
  // QUERIES
  // ==================================================== 
  getCustomers(options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Customer>>;
  getCustomer(customerId: string, options: CommonCommandOptions): Promise<Customer | null>;
}

export const CUSTOMER_PORT = Symbol('CUSTOMER_PORT');
