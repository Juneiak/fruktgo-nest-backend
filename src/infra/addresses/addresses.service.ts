import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { Address, AddressModel } from './address.schema';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { 
  CreateAddressCommand,
  UpdateAddressCommand,
  DeleteAllEntityAddressesCommand 
} from './addresses.commands';
import {
  GetEntityAddressesQuery,
  GetNearbyAddressesQuery
} from './addresses.queries';
import { DomainError } from 'src/common/errors/domain-error';
import { checkId, assignField } from 'src/common/utils';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name) private readonly addressModel: AddressModel,
  ) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getAddress(
    addressId: string,
    queryOptions?: CommonQueryOptions
  ): Promise<Address | null> {
    checkId([addressId]);

    const dbQuery = this.addressModel.findById(new Types.ObjectId(addressId));
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const address = await dbQuery.lean({ virtuals: true }).exec();
    return address;
  }


  async getEntityAddresses(
    query: GetEntityAddressesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Address>> {
    const { entityType, entityId, filters } = query;
    checkId([entityId]);

    const dbQueryFilter: any = {
      entityType,
      entity: new Types.ObjectId(entityId),
    };

    if (filters) {
      if (filters.label) dbQueryFilter.label = filters.label;
      if (filters.city) dbQueryFilter.city = filters.city;
    }

    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 }
    };

    const result = await this.addressModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }

  async getNearbyAddresses(
    query: GetNearbyAddressesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Address>> {
    const { latitude, longitude, radiusKm, filters } = query;

    // Конвертируем км в радианы для MongoDB геозапросов
    const radiusInRadians = radiusKm / 6378.1; // Радиус земли в км

    const dbQueryFilter: any = {
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRadians]
        }
      }
    };

    if (filters) {
      if (filters.entityType) dbQueryFilter.entityType = filters.entityType;
      if (filters.city) dbQueryFilter.city = filters.city;
    }

    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 }
    };

    const result = await this.addressModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  // ПРИМЕЧАНИЕ: Выбранный адрес теперь управляется через поле в схеме сущности:
  // - Shop: address (ObjectId)
  // - Customer: selectedAddress (ObjectId)
  // Используйте getAddress(addressId) для получения конкретного адреса


  // ====================================================
  // COMMANDS
  // ====================================================
  async createAddress(
    command: CreateAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Address> {
    const { entityType, entityId, payload, addressId } = command;
    checkId([entityId]);

    const addressData: any = {
      _id: addressId ? new Types.ObjectId(addressId) : new Types.ObjectId(),
      entityType,
      entity: new Types.ObjectId(entityId),
      latitude: payload.latitude,
      longitude: payload.longitude,
      city: payload.city,
      street: payload.street,
      house: payload.house,
    };

    // Опциональные поля
    assignField(addressData, 'apartment', payload.apartment);
    assignField(addressData, 'floor', payload.floor);
    assignField(addressData, 'entrance', payload.entrance);
    assignField(addressData, 'intercomCode', payload.intercomCode);
    assignField(addressData, 'label', payload.label);

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const [address] = await this.addressModel.create([addressData], createOptions);
    return address.toObject({ virtuals: true });
  }


  async updateAddress(
    command: UpdateAddressCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Address> {
    const { addressId, payload } = command;
    checkId([addressId]);

    const existingAddress = await this.getAddress(addressId);
    if (!existingAddress) {
      throw DomainError.notFound('Address', addressId);
    }

    const updateData: any = {};
    assignField(updateData, 'latitude', payload.latitude);
    assignField(updateData, 'longitude', payload.longitude);
    assignField(updateData, 'city', payload.city);
    assignField(updateData, 'street', payload.street);
    assignField(updateData, 'house', payload.house);
    assignField(updateData, 'apartment', payload.apartment);
    assignField(updateData, 'floor', payload.floor);
    assignField(updateData, 'entrance', payload.entrance);
    assignField(updateData, 'intercomCode', payload.intercomCode);
    assignField(updateData, 'label', payload.label);

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updatedAddress = await this.addressModel
      .findByIdAndUpdate(new Types.ObjectId(addressId), updateData, updateOptions)
      .lean({ virtuals: true })
      .exec();

    if (!updatedAddress) {
      throw DomainError.notFound('Address', addressId);
    }

    return updatedAddress;
  }
  

  // ПРИМЕЧАНИЕ: Установка выбранного адреса теперь делается через обновление сущности:
  // - Shop: обновить поле address
  // - Customer: обновить поле selectedAddress
  // Этот метод удален, используйте соответствующие команды обновления сущностей


  async deleteAddress(
    addressId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    checkId([addressId]);

    const address = await this.getAddress(addressId);
    if (!address) {
      throw DomainError.notFound('Address', addressId);
    }

    // ПРИМЕЧАНИЕ: Если удаляете выбранный адрес сущности (shop.address или customer.selectedAddress),
    // не забудьте обновить соответствующее поле в схеме сущности

    const deleteOptions: any = {};
    if (commandOptions?.session) deleteOptions.session = commandOptions.session;

    const result = await this.addressModel
      .deleteOne({ _id: new Types.ObjectId(addressId) }, deleteOptions)
      .exec();

    if (result.deletedCount === 0) {
      throw DomainError.notFound('Address', addressId);
    }
  }

  async deleteAllEntityAddresses(
    command: DeleteAllEntityAddressesCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { entityType, entityId } = command;
    checkId([entityId]);

    const deleteOptions: any = {};
    if (commandOptions?.session) deleteOptions.session = commandOptions.session;

    await this.addressModel.deleteMany(
      {
        entityType,
        entity: new Types.ObjectId(entityId)
      },
      deleteOptions
    ).exec();
  }
}
