import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SellerWarehousesRoleService } from './seller.warehouses.role.service';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, TypeGuard } from 'src/common/guards';
import { UserType, GetUser } from 'src/common/decorators';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/interface/http/shared';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  UpdateWarehouseStatusDto,
  CreateWarehouseProductDto,
  AdjustStockDto,
  SetStockDto,
} from './seller.warehouses.request.dtos';
import {
  WarehouseResponseDto,
  WarehouseProductResponseDto,
} from './seller.warehouses.response.dtos';

@ApiTags('for seller - warehouses')
@ApiBearerAuth('JWT-auth')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerWarehousesController {
  constructor(
    private readonly warehousesService: SellerWarehousesRoleService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // WAREHOUSES
  // ═══════════════════════════════════════════════════════════════

  @ApiOperation({ summary: 'Список складов' })
  @Get()
  getWarehouses(
    @GetUser() user: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WarehouseResponseDto>> {
    return this.warehousesService.getWarehouses(user, paginationQuery);
  }

  @ApiOperation({ summary: 'Получить склад' })
  @Get(':warehouseId')
  getWarehouse(
    @GetUser() user: AuthenticatedUser,
    @Param('warehouseId') warehouseId: string,
  ): Promise<WarehouseResponseDto> {
    return this.warehousesService.getWarehouse(user, warehouseId);
  }

  @ApiOperation({ summary: 'Создать склад' })
  @Post()
  createWarehouse(
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.warehousesService.createWarehouse(user, dto);
  }

  @ApiOperation({ summary: 'Обновить склад' })
  @Patch(':warehouseId')
  updateWarehouse(
    @GetUser() user: AuthenticatedUser,
    @Param('warehouseId') warehouseId: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.warehousesService.updateWarehouse(user, warehouseId, dto);
  }

  @ApiOperation({ summary: 'Изменить статус склада' })
  @Patch(':warehouseId/status')
  updateWarehouseStatus(
    @GetUser() user: AuthenticatedUser,
    @Param('warehouseId') warehouseId: string,
    @Body() dto: UpdateWarehouseStatusDto,
  ): Promise<WarehouseResponseDto> {
    return this.warehousesService.updateWarehouseStatus(user, warehouseId, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // WAREHOUSE PRODUCTS
  // ═══════════════════════════════════════════════════════════════

  @ApiOperation({ summary: 'Товары на складе' })
  @Get(':warehouseId/products')
  getWarehouseProducts(
    @GetUser() user: AuthenticatedUser,
    @Param('warehouseId') warehouseId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WarehouseProductResponseDto>> {
    return this.warehousesService.getWarehouseProducts(user, warehouseId, paginationQuery);
  }

  @ApiOperation({ summary: 'Добавить товар на склад' })
  @Post(':warehouseId/products')
  createWarehouseProduct(
    @GetUser() user: AuthenticatedUser,
    @Param('warehouseId') warehouseId: string,
    @Body() dto: CreateWarehouseProductDto,
  ): Promise<WarehouseProductResponseDto> {
    return this.warehousesService.createWarehouseProduct(user, warehouseId, dto);
  }

  @ApiOperation({ summary: 'Корректировка остатка (+/-)' })
  @Patch(':warehouseId/products/:warehouseProductId/adjust')
  adjustWarehouseProductStock(
    @GetUser() user: AuthenticatedUser,
    @Param('warehouseId') warehouseId: string,
    @Param('warehouseProductId') warehouseProductId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<WarehouseProductResponseDto> {
    return this.warehousesService.adjustWarehouseProductStock(user, warehouseId, warehouseProductId, dto);
  }

  @ApiOperation({ summary: 'Установить остаток' })
  @Patch(':warehouseId/products/:warehouseProductId/set-stock')
  setWarehouseProductStock(
    @GetUser() user: AuthenticatedUser,
    @Param('warehouseId') warehouseId: string,
    @Param('warehouseProductId') warehouseProductId: string,
    @Body() dto: SetStockDto,
  ): Promise<WarehouseProductResponseDto> {
    return this.warehousesService.setWarehouseProductStock(user, warehouseId, warehouseProductId, dto);
  }

  @ApiOperation({ summary: 'Товары с низким остатком' })
  @Get(':warehouseId/products/low-stock')
  getLowStockProducts(
    @GetUser() user: AuthenticatedUser,
    @Param('warehouseId') warehouseId: string,
  ): Promise<WarehouseProductResponseDto[]> {
    return this.warehousesService.getLowStockProducts(user, warehouseId);
  }
}
