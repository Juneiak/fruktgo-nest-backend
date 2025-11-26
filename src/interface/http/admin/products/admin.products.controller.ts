import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import { AdminProductsRoleService } from './admin.products.role.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import {
  ProductPreviewResponseDto,
  ProductFullResponseDto,
} from './admin.products.response.dtos';
import { PaginatedResponseDto } from 'src/interface/http/shared';
import { PaginationQueryDto } from 'src/interface/http/responses/common.query.dtos';
import { ProductQueryFilterDto } from './admin.products.query.dtos';
import { LogResponseDto } from 'src/interface/http/shared';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminProductsController {
  constructor(
    private readonly adminProductsRoleService: AdminProductsRoleService
  ) {}

  @ApiOperation({summary: 'Получение списка продуктов продавца с пагинацией'})
  @Get()
  getAllSellerProducts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() productQueryFilter: ProductQueryFilterDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductPreviewResponseDto>> {
    return this.adminProductsRoleService.getProducts(authedAdmin, productQueryFilter, paginationQuery);
  }


  @ApiOperation({summary: 'Получение полного продукта продавца'})
  @Get(':productId')
  getSellerProduct(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('productId') productId: string,
  ): Promise<ProductFullResponseDto> {
    return this.adminProductsRoleService.getProduct(authedAdmin, productId);
  }


  @ApiOperation({summary: 'Получение логов продукта продавца'})
  @Get(':productId/logs')
  getProductLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    return this.adminProductsRoleService.getProductLogs(authedAdmin, productId, paginationQuery);
  }
}