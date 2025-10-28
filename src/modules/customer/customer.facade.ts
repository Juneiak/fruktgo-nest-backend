// application/customer.facade.ts
import { Injectable } from '@nestjs/common';
import { CustomerPort } from './customer.port';
import { CustomerService } from './customer.service';
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
  SelectAddressCommand
} from './customer.commands';
import { GetCustomersQuery, GetCustomerQuery } from './customer.queries';

@Injectable()
export class CustomerFacade implements CustomerPort {
  constructor(private readonly customerService: CustomerService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getCustomers(
    query: GetCustomersQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Customer>> {
    return this.customerService.getCustomers(query, queryOptions);
  }

  async getCustomer(
    query: GetCustomerQuery,
    queryOptions?: CommonCommandOptions
  ): Promise<Customer | null> {
    return this.customerService.getCustomer(query, queryOptions);
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createCustomer(
    command: CreateCustomerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Customer> {
    return this.customerService.createCustomer(command, commandOptions);
  }

  async updateCustomer(
    command: UpdateCustomerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.customerService.updateCustomer(command, commandOptions);
  }

  async blockCustomer(
    command: BlockCustomerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.customerService.blockCustomer(command, commandOptions);
  }

  async addAddress(
    command: AddAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.customerService.addAddress(command, commandOptions);
  }

  async deleteAddress(
    command: DeleteAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.customerService.deleteAddress(command, commandOptions);
  }

  async selectAddress(
    command: SelectAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.customerService.selectAddress(command, commandOptions);
  }
}