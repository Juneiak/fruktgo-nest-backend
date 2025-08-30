import { Controller, Get, Param, UseGuards, Body, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import {
  SellerForAdminPreviewResponseDto,
  SellerForAdminFullResponseDto,
  UpdateSellerByAdminDto
} from './seller.admin.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
import { SellerAdminService } from './seller.admin.service';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/sellers')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class SellerAdminController {
  constructor(private readonly sellerAdminService: SellerAdminService) {}


  @ApiOperation({summary: 'Получает информацию всех продавцах с пагинацией'})
  @Get('/')
  getAllSellers(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SellerForAdminPreviewResponseDto>> {
    return this.sellerAdminService.getSellers(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'Получает информацию о продавце'})
  @Get('/:sellerId')
  getCurrentSeller(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string
  ): Promise<SellerForAdminFullResponseDto> {
    return this.sellerAdminService.getSeller(authedAdmin, sellerId);
  }

  @ApiOperation({summary: 'Получает логи продавца'})
  @Get('/:sellerId/logs')
  getSellerLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.sellerAdminService.getSellerLogs(authedAdmin, sellerId, paginationQuery);
  }


  @ApiOperation({summary: 'Обновляет информацию о продавце'})
  @Patch('/:sellerId')
  updateSeller(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
    @Body() dto: UpdateSellerByAdminDto
  ): Promise<SellerForAdminFullResponseDto> {
    return this.sellerAdminService.updateSeller(authedAdmin, sellerId, dto);
  }

}
  