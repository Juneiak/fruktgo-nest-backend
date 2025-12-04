import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateResult, Types, FilterQuery } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainError } from 'src/common/errors';
import { 
  AddressesPort, 
  ADDRESSES_PORT, 
  AddressesCommands, 
  AddressesEnums 
} from 'src/infra/addresses';
import { Warehouse, WarehouseModel } from './warehouse.schema';
import { WarehousePort } from './warehouse.port';
import { WarehouseStatus } from './warehouse.enums';
import * as WarehouseCommands from './warehouse.commands';
import * as WarehouseQueries from './warehouse.queries';

@Injectable()
export class WarehouseService implements WarehousePort {
  constructor(
    @InjectModel(Warehouse.name) private readonly warehouseModel: WarehouseModel,
    @Inject(ADDRESSES_PORT) private readonly addressesPort: AddressesPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getWarehouse(
    query: WarehouseQueries.GetWarehouseQuery,
    options?: CommonCommandOptions,
  ): Promise<Warehouse | null> {
    return this.warehouseModel
      .findById(query.warehouseId)
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getWarehouseByExternalCode(
    query: WarehouseQueries.GetWarehouseByExternalCodeQuery,
    options?: CommonCommandOptions,
  ): Promise<Warehouse | null> {
    return this.warehouseModel
      .findOne({
        seller: new Types.ObjectId(query.sellerId),
        externalCode: query.externalCode,
      })
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getWarehouses(
    query: WarehouseQueries.GetWarehousesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt' | 'name'>,
  ): Promise<PaginateResult<Warehouse>> {
    const filter: FilterQuery<Warehouse> = {};

    if (query.filters.sellerId) {
      filter.seller = new Types.ObjectId(query.filters.sellerId);
    }
    if (query.filters.status) {
      filter.status = query.filters.status;
    }
    // NOTE: фильтр по city убран, т.к. адрес теперь в отдельной коллекции Address
    // Для фильтрации по городу нужно делать lookup или отдельный запрос к AddressesPort

    const page = queryOptions?.pagination?.page || 1;
    const limit = queryOptions?.pagination?.pageSize || 20;
    const sort = queryOptions?.sort || { createdAt: -1 };

    return this.warehouseModel.paginate(filter, {
      page,
      limit,
      sort,
      lean: true,
      leanWithId: false,
    });
  }

  async getWarehousesBySeller(
    query: WarehouseQueries.GetWarehousesBySellerQuery,
    options?: CommonCommandOptions,
  ): Promise<Warehouse[]> {
    const filter: FilterQuery<Warehouse> = {
      seller: new Types.ObjectId(query.sellerId),
    };

    if (query.activeOnly) {
      filter.status = WarehouseStatus.ACTIVE;
    }

    return this.warehouseModel
      .find(filter)
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createWarehouse(
    command: WarehouseCommands.CreateWarehouseCommand,
    options?: CommonCommandOptions,
  ): Promise<Warehouse> {
    const { data } = command;

    // Проверяем уникальность externalCode если указан
    if (data.externalCode) {
      const existing = await this.warehouseModel.findOne({
        seller: new Types.ObjectId(data.sellerId),
        externalCode: data.externalCode,
      }).session(options?.session || null);

      if (existing) {
        throw DomainError.validation('Склад с таким внешним кодом уже существует', {
          externalCode: data.externalCode,
        });
      }
    }

    // Создаём склад
    const warehouse = new this.warehouseModel({
      seller: new Types.ObjectId(data.sellerId),
      name: data.name,
      contact: data.contact,
      externalCode: data.externalCode,
      description: data.description,
      status: WarehouseStatus.ACTIVE,
    });

    const saved = await warehouse.save({ session: options?.session });
    const warehouseId = saved._id.toString();

    // Создаём адрес через AddressesPort если предоставлен
    if (data.address) {
      const addressCommand = new AddressesCommands.CreateAddressCommand(
        AddressesEnums.AddressEntityType.WAREHOUSE,
        warehouseId,
        {
          latitude: data.address.latitude,
          longitude: data.address.longitude,
          city: data.address.city,
          street: data.address.street,
          house: data.address.house,
          apartment: data.address.apartment,
          floor: data.address.floor,
          entrance: data.address.entrance,
          intercomCode: data.address.intercomCode,
          label: data.address.label,
        },
      );

      const address = await this.addressesPort.createAddress(addressCommand, options);

      // Обновляем склад с ссылкой на адрес
      await this.warehouseModel.findByIdAndUpdate(
        warehouseId,
        { $set: { address: address._id } },
        { session: options?.session },
      );

      saved.address = address._id;
    }

    return saved.toObject({ virtuals: true });
  }

  async updateWarehouse(
    command: WarehouseCommands.UpdateWarehouseCommand,
    options?: CommonCommandOptions,
  ): Promise<Warehouse> {
    const { warehouseId, data } = command;

    const warehouse = await this.warehouseModel.findById(warehouseId);
    if (!warehouse) {
      throw DomainError.notFound('Warehouse', warehouseId);
    }

    const update: any = {};

    if (data.name !== undefined) update.name = data.name;
    if (data.externalCode !== undefined) update.externalCode = data.externalCode;
    if (data.description !== undefined) update.description = data.description;

    // Обновляем адрес через AddressesPort
    if (data.address && Object.keys(data.address).length > 0) {
      if (warehouse.address) {
        // Обновляем существующий адрес
        const updateCommand = new AddressesCommands.UpdateAddressCommand(
          warehouse.address.toString(),
          data.address,
        );
        await this.addressesPort.updateAddress(updateCommand, options);
      } else {
        // Создаём новый адрес если его не было
        const addressCommand = new AddressesCommands.CreateAddressCommand(
          AddressesEnums.AddressEntityType.WAREHOUSE,
          warehouseId,
          {
            latitude: data.address.latitude || 0,
            longitude: data.address.longitude || 0,
            city: data.address.city || '',
            street: data.address.street || '',
            house: data.address.house || '',
            apartment: data.address.apartment,
            floor: data.address.floor,
            entrance: data.address.entrance,
            intercomCode: data.address.intercomCode,
            label: data.address.label,
          },
        );
        const address = await this.addressesPort.createAddress(addressCommand, options);
        update.address = address._id;
      }
    }

    if (data.contact) {
      for (const [key, value] of Object.entries(data.contact)) {
        if (value !== undefined) {
          update[`contact.${key}`] = value;
        }
      }
    }

    const updated = await this.warehouseModel
      .findByIdAndUpdate(warehouseId, { $set: update }, { new: true })
      .session(options?.session || null)
      .lean({ virtuals: true });

    return updated!;
  }

  async updateWarehouseStatus(
    command: WarehouseCommands.UpdateWarehouseStatusCommand,
    options?: CommonCommandOptions,
  ): Promise<Warehouse> {
    const { warehouseId, status } = command;

    const updated = await this.warehouseModel
      .findByIdAndUpdate(warehouseId, { $set: { status } }, { new: true })
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('Warehouse', warehouseId);
    }

    return updated;
  }

  async deleteWarehouse(
    command: WarehouseCommands.DeleteWarehouseCommand,
    options?: CommonCommandOptions,
  ): Promise<void> {
    const { warehouseId } = command;

    // Soft delete через смену статуса
    const updated = await this.warehouseModel
      .findByIdAndUpdate(warehouseId, { $set: { status: WarehouseStatus.CLOSED } })
      .session(options?.session || null);

    if (!updated) {
      throw DomainError.notFound('Warehouse', warehouseId);
    }
  }
}
