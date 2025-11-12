import { Injectable } from '@nestjs/common';
import { AddressesPort } from './addresses.port';
import { AddressesService } from './addresses.service';
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

@Injectable()
export class AddressesFacade implements AddressesPort {
  constructor(private readonly addressesService: AddressesService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getAddress(addressId: string, queryOptions?: CommonQueryOptions): Promise<Address | null> {
    return this.addressesService.getAddress(addressId, queryOptions);
  }

  async getEntityAddresses(
    query: GetEntityAddressesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Address>> {
    return this.addressesService.getEntityAddresses(query, queryOptions);
  }

  async getNearbyAddresses(
    query: GetNearbyAddressesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Address>> {
    return this.addressesService.getNearbyAddresses(query, queryOptions);
  }

  async getDefaultAddress(
    entityType: string,
    entityId: string,
    queryOptions?: CommonQueryOptions
  ): Promise<Address | null> {
    return this.addressesService.getDefaultAddress(entityType, entityId, queryOptions);
  }

  // ====================================================
  // COMMANDS
  // ====================================================
  async createAddress(
    command: CreateAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Address> {
    return this.addressesService.createAddress(command, commandOptions);
  }

  async updateAddress(
    command: UpdateAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Address> {
    return this.addressesService.updateAddress(command, commandOptions);
  }

  async setDefaultAddress(
    command: SetDefaultAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.addressesService.setDefaultAddress(command, commandOptions);
  }

  async deleteAddress(addressId: string, commandOptions?: CommonCommandOptions): Promise<void> {
    return this.addressesService.deleteAddress(addressId, commandOptions);
  }

  async deleteAllEntityAddresses(
    command: DeleteAllEntityAddressesCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.addressesService.deleteAllEntityAddresses(command, commandOptions);
  }
}
