import { Controller, Get, Param, UseGuards, Patch, Body, Query } from '@nestjs/common';
import { ShopForAdminService } from './shop-for-admin.service';
import {
  ShopForAdminPreviewResponseDto,
  ShopForAdminFullResponseDto,
  UpdateShopByAdminDto,
  ShopShiftForAdminPreviewResponceDto,
  ShopShiftForAdminFullResponseDto,
  ShopProductForAdminPreviewResponseDto,
  ShopProductForAdminFullResponseDto,
  ShiftFilterQuery
} from './shop-for-admin.dtos';
import { ApiOkResponse, ApiTags, ApiOperation, ApiBearerAuth} from '@nestjs/swagger';
import { ApiShopIdParam, ApiShiftIdParam } from 'src/common/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('shops/for-admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class ShopForAdminController {
  constructor(private readonly shopForAdminService: ShopForAdminService) {}

  @ApiOperation({summary: 'Получает превью смен магазина с пагинацией'})
  @ApiShopIdParam()
  @ApiOkResponse({type: () => PaginatedResponseDto})
  @Get('/shifts')
  getShifts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query() shiftFilterQuery: ShiftFilterQuery
  ): Promise<PaginatedResponseDto<ShopShiftForAdminPreviewResponceDto>> {
    return this.shopForAdminService.getShifts(authedAdmin, paginationQuery, shiftFilterQuery);
  }


  @ApiOperation({summary: 'Получает логи смены'})
  @ApiShopIdParam()
  @ApiShiftIdParam()
  @ApiOkResponse({type: () => PaginatedResponseDto})
  @Get('/shifts/:shiftId/logs')
  getShiftLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedLogDto> {
    return this.shopForAdminService.getShiftLogs(authedAdmin, shiftId, paginationQuery);
  }
  

  // ====================================================
  // SHOPS
  // ====================================================
  @ApiOperation({summary: 'Получает информацию обо всех магазинах с пагинацией'})
  @ApiOkResponse({type: () => PaginatedResponseDto})
  // ====================================================
  @Get('/')
  getAllShops(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopForAdminPreviewResponseDto>> {
    return this.shopForAdminService.getShops(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'Получает информацию о магазине'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShopForAdminFullResponseDto})
  // ====================================================
  @Get('/:shopId')
  getCurrentShop(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string
  ): Promise<ShopForAdminFullResponseDto> {
    return this.shopForAdminService.getShop(authedAdmin, shopId);
  }

  @ApiOperation({summary: 'Получает логи магазина'})
  @ApiShopIdParam()
  @ApiOkResponse({type: () => PaginatedLogDto})
  // ====================================================
  @Get('/:shopId/logs')
  getShopLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shopForAdminService.getShopLogs(authedAdmin, shopId, paginationQuery);
  }

  @ApiOperation({summary: 'Обновляет информацию о магазине'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShopForAdminFullResponseDto})
  // ====================================================
  @Patch('/:shopId')
  updateShop(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopByAdminDto,
  ): Promise<ShopForAdminFullResponseDto> {
    return this.shopForAdminService.updateShop(authedAdmin, shopId, dto);
  }



  // ====================================================
  // SHIFTS
  // ====================================================
  @ApiOperation({summary: 'Получает превью смен магазина с пагинацией'})
  @ApiShopIdParam()
  @ApiOkResponse({type: () => PaginatedResponseDto})
  @Get('/:shopId/shifts')
  getShopShifts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopShiftForAdminPreviewResponceDto>> {
    return this.shopForAdminService.getShopShifts(authedAdmin, shopId, paginationQuery);
  }

  @ApiOperation({summary: 'Получает полную информацию о смене'})
  @ApiShiftIdParam()
  @ApiOkResponse({type: ShopShiftForAdminFullResponseDto})
  // ====================================================
  @Get('/shifts/:shiftId')
  getShopShift(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShopShiftForAdminFullResponseDto> {
    return this.shopForAdminService.getShopShift(authedAdmin, shiftId);
  }

  @ApiOperation({summary: 'Получает логи смены'})
  @ApiShopIdParam()
  @ApiShiftIdParam()
  @ApiOkResponse({type: () => PaginatedLogDto})
  @Get('/:shopId/shifts/:shiftId/logs')
  getShopShiftLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('shiftId') shiftId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shopForAdminService.getShopShiftLogs(authedAdmin, shopId, shiftId, paginationQuery);
  }

  // ====================================================
  // SHOP PRODUCTS
  // ====================================================

  @ApiOperation({summary: 'Получает превью продуктов магазина с пагинацией'})
  @ApiShopIdParam()
  @ApiOkResponse({type: () => PaginatedResponseDto})
  @Get('/:shopId/shop-products')
  getShopProducts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductForAdminPreviewResponseDto>> {
    return this.shopForAdminService.getShopProducts(authedAdmin, shopId, paginationQuery);
  }

  @ApiOperation({summary: 'Получает полную информацию о продукте магазина'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShopProductForAdminFullResponseDto})
  // ====================================================
  @Get('/:shopId/shop-products/:shopProductId')
  getShopProduct(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('shopProductId') shopProductId: string,
  ): Promise<ShopProductForAdminFullResponseDto> {
    return this.shopForAdminService.getShopProduct(authedAdmin, shopId, shopProductId);
  }
}
