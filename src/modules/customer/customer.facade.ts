// application/customer.facade.ts
import { Injectable } from '@nestjs/common';
import { CustomerPort } from './customer.port';
import { CustomerService } from './customer.service';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { Customer } from '../infrastructure/schemas/customer.schema';
import { PaginateResult } from 'mongoose';
import {
  UpdateCustomerCommand,
  BlockCustomerCommand,
  AddAddressCommand,
  DeleteAddressCommand,
  SelectAddressCommand
} from './customer.commands';

@Injectable()
export class CustomerFacade implements CustomerPort {
  constructor(private readonly customerService: CustomerService) {}

  // ====================================================
  // COMMANDS
  // ====================================================
  async updateCustomer(command: UpdateCustomerCommand, options: CommonCommandOptions): Promise<void> {
    return this.customerService.updateCustomer(command, options);
  }

  async blockCustomer(command: BlockCustomerCommand, options: CommonCommandOptions): Promise<void> {
    return this.customerService.blockCustomer(command, options);
  }

  async addAddress(command: AddAddressCommand, options: CommonCommandOptions): Promise<void> {
    return this.customerService.addAddress(command, options);
  }

  async deleteAddress(command: DeleteAddressCommand, options: CommonCommandOptions): Promise<void> {
    return this.customerService.deleteAddress(command, options);
  }

  async selectAddress(command: SelectAddressCommand, options: CommonCommandOptions): Promise<void> {
    return this.customerService.selectAddress(command, options);
  }

  // ====================================================
  // QUERIES
  // ====================================================
  async getCustomers(options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Customer>> {
    return this.customerService.getCustomers(options);
  }

  async getCustomer(customerId: string, options: CommonCommandOptions): Promise<Customer | null> {
    return this.customerService.getCustomer(customerId, options);
  }
}