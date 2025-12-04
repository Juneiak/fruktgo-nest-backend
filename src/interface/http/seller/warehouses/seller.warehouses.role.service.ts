import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DomainErrorCode, handleServiceError } from 'src/common/errors';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { PaginatedResponseDto, transformPaginatedResult, PaginationQueryDto } from 'src/interface/http/shared';
import {
  WarehousePort,
  WAREHOUSE_PORT,
  WarehouseCommands,
  WarehouseQueries,
} from 'src/modules/warehouse';
import {
  WarehouseProductPort,
  WAREHOUSE_PRODUCT_PORT,
  WarehouseProductCommands,
  WarehouseProductQueries,
} from 'src/modules/warehouse-product';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  UpdateWarehouseStatusDto,
  CreateWarehouseProductDto,
  UpdateWarehouseProductDto,
  AdjustStockDto,
  SetStockDto,
} from './seller.warehouses.request.dtos';
import {
  WarehouseResponseDto,
  WarehouseProductResponseDto,
} from './seller.warehouses.response.dtos';

@Injectable()
export class SellerWarehousesRoleService {
  constructor(
    @Inject(WAREHOUSE_PORT) private readonly warehousePort: WarehousePort,
    @Inject(WAREHOUSE_PRODUCT_PORT) private readonly warehouseProductPort: WarehouseProductPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // WAREHOUSES
  // ═══════════════════════════════════════════════════════════════

  async getWarehouses(
    authedUser: AuthenticatedUser,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WarehouseResponseDto>> {
    try {
      const query = new WarehouseQueries.GetWarehousesQuery({
        sellerId: authedUser.id,
      });

      const queryOptions: CommonListQueryOptions<'createdAt' | 'name'> = {
        pagination: paginationQuery,
        sort: { createdAt: -1 },
      };

      const result = await this.warehousePort.getWarehouses(query, queryOptions);
      return transformPaginatedResult(result, WarehouseResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Склад не найден'),
      });
    }
  }

  async getWarehouse(
    authedUser: AuthenticatedUser,
    warehouseId: string,
  ): Promise<WarehouseResponseDto> {
    try {
      const warehouse = await this.warehousePort.getWarehouse(
        new WarehouseQueries.GetWarehouseQuery(warehouseId)
      );

      if (!warehouse || warehouse.seller.toString() !== authedUser.id) {
        throw new NotFoundException('Склад не найден');
      }

      return plainToInstance(WarehouseResponseDto, warehouse, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Склад не найден'),
      });
    }
  }

  async createWarehouse(
    authedUser: AuthenticatedUser,
    dto: CreateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    try {
      const warehouse = await this.warehousePort.createWarehouse(
        new WarehouseCommands.CreateWarehouseCommand({
          sellerId: authedUser.id,
          name: dto.name,
          address: dto.address,
          contact: dto.contact,
          externalCode: dto.externalCode,
          description: dto.description,
        })
      );

      return plainToInstance(WarehouseResponseDto, warehouse, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.VALIDATION]: new ForbiddenException('Ошибка валидации'),
      });
    }
  }

  async updateWarehouse(
    authedUser: AuthenticatedUser,
    warehouseId: string,
    dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    try {
      // Проверяем владельца
      const existing = await this.warehousePort.getWarehouse(
        new WarehouseQueries.GetWarehouseQuery(warehouseId)
      );
      if (!existing || existing.seller.toString() !== authedUser.id) {
        throw new NotFoundException('Склад не найден');
      }

      const warehouse = await this.warehousePort.updateWarehouse(
        new WarehouseCommands.UpdateWarehouseCommand(warehouseId, dto)
      );

      return plainToInstance(WarehouseResponseDto, warehouse, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Склад не найден'),
      });
    }
  }

  async updateWarehouseStatus(
    authedUser: AuthenticatedUser,
    warehouseId: string,
    dto: UpdateWarehouseStatusDto,
  ): Promise<WarehouseResponseDto> {
    try {
      const existing = await this.warehousePort.getWarehouse(
        new WarehouseQueries.GetWarehouseQuery(warehouseId)
      );
      if (!existing || existing.seller.toString() !== authedUser.id) {
        throw new NotFoundException('Склад не найден');
      }

      const warehouse = await this.warehousePort.updateWarehouseStatus(
        new WarehouseCommands.UpdateWarehouseStatusCommand(warehouseId, dto.status)
      );

      return plainToInstance(WarehouseResponseDto, warehouse, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Склад не найден'),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WAREHOUSE PRODUCTS
  // ═══════════════════════════════════════════════════════════════

  async getWarehouseProducts(
    authedUser: AuthenticatedUser,
    warehouseId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WarehouseProductResponseDto>> {
    try {
      // Проверяем владельца склада
      const warehouse = await this.warehousePort.getWarehouse(
        new WarehouseQueries.GetWarehouseQuery(warehouseId)
      );
      if (!warehouse || warehouse.seller.toString() !== authedUser.id) {
        throw new NotFoundException('Склад не найден');
      }

      const query = new WarehouseProductQueries.GetWarehouseProductsQuery({
        warehouseId,
      });

      const queryOptions: CommonListQueryOptions<'createdAt' | 'stockQuantity'> = {
        pagination: paginationQuery,
        sort: { createdAt: -1 },
      };

      const result = await this.warehouseProductPort.getWarehouseProducts(query, queryOptions);
      return transformPaginatedResult(result, WarehouseProductResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Склад не найден'),
      });
    }
  }

  async createWarehouseProduct(
    authedUser: AuthenticatedUser,
    warehouseId: string,
    dto: CreateWarehouseProductDto,
  ): Promise<WarehouseProductResponseDto> {
    try {
      const warehouse = await this.warehousePort.getWarehouse(
        new WarehouseQueries.GetWarehouseQuery(warehouseId)
      );
      if (!warehouse || warehouse.seller.toString() !== authedUser.id) {
        throw new NotFoundException('Склад не найден');
      }

      const product = await this.warehouseProductPort.createWarehouseProduct(
        new WarehouseProductCommands.CreateWarehouseProductCommand({
          warehouseId,
          productId: dto.productId,
          stockQuantity: dto.stockQuantity,
          externalCode: dto.externalCode,
          minStockLevel: dto.minStockLevel,
        })
      );

      return plainToInstance(WarehouseProductResponseDto, product, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Склад или товар не найден'),
        [DomainErrorCode.VALIDATION]: new ForbiddenException('Товар уже добавлен на склад'),
      });
    }
  }

  async adjustWarehouseProductStock(
    authedUser: AuthenticatedUser,
    warehouseId: string,
    warehouseProductId: string,
    dto: AdjustStockDto,
  ): Promise<WarehouseProductResponseDto> {
    try {
      const warehouse = await this.warehousePort.getWarehouse(
        new WarehouseQueries.GetWarehouseQuery(warehouseId)
      );
      if (!warehouse || warehouse.seller.toString() !== authedUser.id) {
        throw new NotFoundException('Склад не найден');
      }

      const product = await this.warehouseProductPort.adjustStockQuantity(
        new WarehouseProductCommands.AdjustStockQuantityCommand(warehouseProductId, dto.adjustment)
      );

      return plainToInstance(WarehouseProductResponseDto, product, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.VALIDATION]: new ForbiddenException('Недостаточно остатков'),
      });
    }
  }

  async setWarehouseProductStock(
    authedUser: AuthenticatedUser,
    warehouseId: string,
    warehouseProductId: string,
    dto: SetStockDto,
  ): Promise<WarehouseProductResponseDto> {
    try {
      const warehouse = await this.warehousePort.getWarehouse(
        new WarehouseQueries.GetWarehouseQuery(warehouseId)
      );
      if (!warehouse || warehouse.seller.toString() !== authedUser.id) {
        throw new NotFoundException('Склад не найден');
      }

      const product = await this.warehouseProductPort.setStockQuantity(
        new WarehouseProductCommands.SetStockQuantityCommand(warehouseProductId, dto.quantity)
      );

      return plainToInstance(WarehouseProductResponseDto, product, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
      });
    }
  }

  async getLowStockProducts(
    authedUser: AuthenticatedUser,
    warehouseId: string,
  ): Promise<WarehouseProductResponseDto[]> {
    try {
      const warehouse = await this.warehousePort.getWarehouse(
        new WarehouseQueries.GetWarehouseQuery(warehouseId)
      );
      if (!warehouse || warehouse.seller.toString() !== authedUser.id) {
        throw new NotFoundException('Склад не найден');
      }

      const products = await this.warehouseProductPort.getLowStockWarehouseProducts(
        new WarehouseProductQueries.GetLowStockWarehouseProductsQuery(warehouseId)
      );

      return plainToInstance(WarehouseProductResponseDto, products, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Склад не найден'),
      });
    }
  }
}
