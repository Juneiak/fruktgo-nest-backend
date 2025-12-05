import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { StorageLocation, StorageLocationModel } from './storage-location.schema';
import { StorageLocationPort } from './storage-location.port';
import { StorageLocationType } from './storage-location.enums';
import * as Commands from './storage-location.commands';
import * as Queries from './storage-location.queries';
import { ShelfLifeCalculatorService } from '../../core/shelf-life-calculator';
import { StoragePreset } from '../../core/storage-preset';

@Injectable()
export class StorageLocationService implements StorageLocationPort {
  constructor(
    @InjectModel(StorageLocation.name)
    private readonly locationModel: StorageLocationModel,
    private readonly shelfLifeCalculator: ShelfLifeCalculatorService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(
    command: Commands.CreateStorageLocationCommand,
  ): Promise<StorageLocation> {
    const { data } = command;

    const location = new this.locationModel({
      seller: new Types.ObjectId(data.seller.toString()),
      locationType: data.locationType,
      shop:
        data.locationType === StorageLocationType.SHOP && data.shop
          ? new Types.ObjectId(data.shop.toString())
          : undefined,
      warehouse:
        data.locationType === StorageLocationType.WAREHOUSE && data.warehouse
          ? new Types.ObjectId(data.warehouse.toString())
          : undefined,
      name: data.name,
      address: data.address,
      defaultConditions: {
        temperature: data.defaultConditions?.temperature,
        humidity: data.defaultConditions?.humidity,
        lastUpdatedAt: new Date(),
        source: 'manual',
      },
      notes: data.notes,
    });

    // Расчёт начального коэффициента деградации
    location.degradationCoefficient = this.calculateDegradationCoefficient(
      location.defaultConditions.temperature,
      location.defaultConditions.humidity,
    );

    return location.save();
  }

  async update(
    command: Commands.UpdateStorageLocationCommand,
  ): Promise<StorageLocation> {
    const location = await this.locationModel.findByIdAndUpdate(
      command.locationId,
      { $set: command.data },
      { new: true },
    );

    if (!location) {
      throw new Error(`StorageLocation ${command.locationId} not found`);
    }

    return location;
  }

  async updateConditions(
    command: Commands.UpdateConditionsCommand,
  ): Promise<StorageLocation> {
    const updates: any = {
      'defaultConditions.lastUpdatedAt': new Date(),
    };

    if (command.data.temperature) {
      updates['defaultConditions.temperature'] = command.data.temperature;
    }
    if (command.data.humidity) {
      updates['defaultConditions.humidity'] = command.data.humidity;
    }
    if (command.data.source) {
      updates['defaultConditions.source'] = command.data.source;
    }

    const location = await this.locationModel.findByIdAndUpdate(
      command.locationId,
      { $set: updates },
      { new: true },
    );

    if (!location) {
      throw new Error(`StorageLocation ${command.locationId} not found`);
    }

    // Пересчёт коэффициента
    location.degradationCoefficient = this.calculateDegradationCoefficient(
      location.defaultConditions.temperature,
      location.defaultConditions.humidity,
    );
    await location.save();

    return location;
  }

  async updateStatus(
    command: Commands.UpdateStorageLocationStatusCommand,
  ): Promise<StorageLocation> {
    const location = await this.locationModel.findByIdAndUpdate(
      command.locationId,
      { $set: { status: command.status } },
      { new: true },
    );

    if (!location) {
      throw new Error(`StorageLocation ${command.locationId} not found`);
    }

    return location;
  }

  async addZone(
    command: Commands.AddStorageZoneCommand,
  ): Promise<StorageLocation> {
    const zone = {
      _id: new Types.ObjectId(),
      name: command.data.name,
      equipmentType: command.data.equipmentType,
      conditions: {
        temperature: command.data.conditions?.temperature,
        humidity: command.data.conditions?.humidity,
        lastUpdatedAt: new Date(),
        source: 'manual',
      },
      capacity: command.data.capacity,
      usedCapacity: 0,
    };

    const location = await this.locationModel.findByIdAndUpdate(
      command.locationId,
      { $push: { zones: zone } },
      { new: true },
    );

    if (!location) {
      throw new Error(`StorageLocation ${command.locationId} not found`);
    }

    return location;
  }

  async updateZone(
    command: Commands.UpdateStorageZoneCommand,
  ): Promise<StorageLocation> {
    const updates: any = {};

    if (command.data.name) {
      updates['zones.$.name'] = command.data.name;
    }
    if (command.data.equipmentType) {
      updates['zones.$.equipmentType'] = command.data.equipmentType;
    }
    if (command.data.capacity !== undefined) {
      updates['zones.$.capacity'] = command.data.capacity;
    }
    if (command.data.conditions?.temperature) {
      updates['zones.$.conditions.temperature'] = command.data.conditions.temperature;
    }
    if (command.data.conditions?.humidity) {
      updates['zones.$.conditions.humidity'] = command.data.conditions.humidity;
    }

    const location = await this.locationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(command.locationId.toString()),
        'zones._id': new Types.ObjectId(command.zoneId.toString()),
      },
      { $set: updates },
      { new: true },
    );

    if (!location) {
      throw new Error(`StorageLocation ${command.locationId} or Zone ${command.zoneId} not found`);
    }

    return location;
  }

  async removeZone(
    command: Commands.RemoveStorageZoneCommand,
  ): Promise<StorageLocation> {
    const location = await this.locationModel.findByIdAndUpdate(
      command.locationId,
      { $pull: { zones: { _id: new Types.ObjectId(command.zoneId.toString()) } } },
      { new: true },
    );

    if (!location) {
      throw new Error(`StorageLocation ${command.locationId} not found`);
    }

    return location;
  }

  async recalculateDegradation(
    command: Commands.RecalculateDegradationCommand,
  ): Promise<number> {
    const location = await this.locationModel.findById(command.locationId);
    if (!location) {
      throw new Error(`StorageLocation ${command.locationId} not found`);
    }

    const coefficient = this.calculateDegradationCoefficient(
      location.defaultConditions.temperature,
      location.defaultConditions.humidity,
    );

    location.degradationCoefficient = coefficient;
    await location.save();

    return coefficient;
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(
    query: Queries.GetStorageLocationByIdQuery,
  ): Promise<StorageLocation | null> {
    return this.locationModel.findById(query.locationId);
  }

  async getByShop(
    query: Queries.GetStorageLocationByShopQuery,
  ): Promise<StorageLocation | null> {
    return this.locationModel.findOne({
      locationType: StorageLocationType.SHOP,
      shop: new Types.ObjectId(query.shopId.toString()),
    });
  }

  async getByWarehouse(
    query: Queries.GetStorageLocationByWarehouseQuery,
  ): Promise<StorageLocation | null> {
    return this.locationModel.findOne({
      locationType: StorageLocationType.WAREHOUSE,
      warehouse: new Types.ObjectId(query.warehouseId.toString()),
    });
  }

  async getBySeller(
    query: Queries.GetStorageLocationsBySellerQuery,
  ): Promise<{ items: StorageLocation[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.locationType) {
      filter.locationType = query.data.locationType;
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    const [items, total] = await Promise.all([
      this.locationModel
        .find(filter)
        .sort({ name: 1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.locationModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async count(query: Queries.CountStorageLocationsQuery): Promise<number> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.locationType) {
      filter.locationType = query.data.locationType;
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    return this.locationModel.countDocuments(filter);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Рассчитать коэффициент деградации по условиям
   */
  private calculateDegradationCoefficient(
    temperature: string,
    humidity: string,
  ): number {
    // Используем ShelfLifeCalculatorService с generic пресетом
    const result = this.shelfLifeCalculator.calculateDegradationCoefficient(
      StoragePreset.GENERIC,
      this.temperatureToNumeric(temperature),
      this.humidityToNumeric(humidity),
    );
    return result.coefficient;
  }

  private temperatureToNumeric(temp: string): number {
    switch (temp) {
      case 'FREEZER': return -18;
      case 'COLD': return 2;
      case 'COOL': return 12;
      case 'ROOM': return 20;
      case 'WARM': return 30;
      default: return 20;
    }
  }

  private humidityToNumeric(humidity: string): number {
    switch (humidity) {
      case 'DRY': return 40;
      case 'NORMAL': return 60;
      case 'HUMID': return 80;
      case 'VERY_HUMID': return 95;
      default: return 60;
    }
  }
}
