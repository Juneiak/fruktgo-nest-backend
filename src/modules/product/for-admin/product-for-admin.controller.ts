import { Controller, Get, UseGuards, Param, Query} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { ProductForAdminService } from './product-for-admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import {
  ProductForAdminPreviewResponseDto,
  ProductForAdminFullResponseDto,
} from './product-for-admin.dtos';
import { ApiProductIdParam } from 'src/common/swagger';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('products/for-admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class ProductForAdminController {
  constructor(private readonly productForAdminService: ProductForAdminService) {}


  @ApiOperation({summary: 'Получение списка продуктов продавца с пагинацией'})
  @ApiOkResponse({type: () => PaginatedResponseDto})
  @ApiQuery({ name: 'sellerId', description: 'ID продавца для фильтрации продуктов', required: true })
  @Get('/')
  getAllSellerProducts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query('sellerId') sellerId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductForAdminPreviewResponseDto>> {
    return this.productForAdminService.getAllSellerProducts(authedAdmin, sellerId, paginationQuery);
  }


  @ApiOperation({summary: 'Получение полного продукта продавца'})
  @ApiProductIdParam()
  @ApiOkResponse({type: ProductForAdminFullResponseDto})
  @Get('/:productId')
  getSellerProduct(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('productId') productId: string,
  ): Promise<ProductForAdminFullResponseDto> {
    return this.productForAdminService.getSellerProduct(authedAdmin, productId);
  }

  @ApiOperation({summary: 'Получение логов продукта продавца'})
  @ApiProductIdParam()
  @ApiOkResponse({type: () => PaginatedLogDto})
  @Get('/:productId/logs')
  getProductLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.productForAdminService.getProductLogs(authedAdmin, productId, paginationQuery);
  }

}
