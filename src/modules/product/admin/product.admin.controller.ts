import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import { ProductAdminService } from './product.admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import {
  ProductPreviewResponseDto,
  ProductFullResponseDto,
} from './product.response.dtos';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import { ProductQueryFilterDto } from './product.admin.filter.dto';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/products')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class ProductAdminController {
  constructor(private readonly productAdminService: ProductAdminService) {}

  @ApiOperation({summary: 'Получение списка продуктов продавца с пагинацией'})
  @Get('/')
  getAllSellerProducts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() productQueryFilter: ProductQueryFilterDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductPreviewResponseDto>> {
    return this.productAdminService.getProducts(authedAdmin, productQueryFilter, paginationQuery);
  }

  
  @ApiOperation({summary: 'Получение полного продукта продавца'})
  @Get('/:productId')
  getSellerProduct(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('productId') productId: string,
  ): Promise<ProductFullResponseDto> {
    return this.productAdminService.getProduct(authedAdmin, productId);
  }


  @ApiOperation({summary: 'Получение логов продукта продавца'})
  @Get('/:productId/logs')
  getProductLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.productAdminService.getProductLogs(authedAdmin, productId, paginationQuery);
  }
}