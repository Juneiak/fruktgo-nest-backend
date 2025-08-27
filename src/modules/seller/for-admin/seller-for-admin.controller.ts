import { Controller, Get, Param, UseGuards, Body, Patch, Query } from '@nestjs/common';
import { SellerForAdminService } from './seller-for-admin.service'
import { ApiBearerAuth, ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiSellerIdParam } from 'src/common/swagger';
import {
  SellerForAdminPreviewResponseDto,
  SellerForAdminFullResponseDto,
  UpdateSellerByAdminDto
} from './seller-for-admin.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { LogDto, PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('sellers/for-admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class SellerForAdminController {
  constructor(private readonly sellerForAdminService: SellerForAdminService) {}


  @ApiOperation({summary: 'Получает информацию всех продавцах с пагинацией'})
  @ApiOkResponse({type: () => PaginatedResponseDto})
  // ====================================================
  @Get('/')
  getAllSellers(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SellerForAdminPreviewResponseDto>> {
    return this.sellerForAdminService.getSellers(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'Получает информацию о продавце'})
  @ApiSellerIdParam()
  @ApiOkResponse({type: SellerForAdminFullResponseDto})
  // ====================================================
  @Get('/:sellerId')
  getCurrentSeller(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string
  ): Promise<SellerForAdminFullResponseDto> {
    return this.sellerForAdminService.getSeller(authedAdmin, sellerId);
  }

  @ApiOperation({summary: 'Получает логи продавца'})
  @ApiSellerIdParam()
  @ApiOkResponse({type: () => PaginatedLogDto})
  // ====================================================
  @Get('/:sellerId/logs')
  getSellerLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.sellerForAdminService.getSellerLogs(authedAdmin, sellerId, paginationQuery);
  }


  @ApiOperation({summary: 'Обновляет информацию о продавце'})
  @ApiSellerIdParam()
  @ApiOkResponse({type: SellerForAdminFullResponseDto})
  // ====================================================
  @Patch('/:sellerId')
  updateSeller(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
    @Body() dto: UpdateSellerByAdminDto
  ): Promise<SellerForAdminFullResponseDto> {
    return this.sellerForAdminService.updateSeller(authedAdmin, sellerId, dto);
  }

}
  