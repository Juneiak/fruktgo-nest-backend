import { Controller, Get, Param, Query, UseGuards, Body, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { PaginatedResponseDto, LogResponseDto } from 'src/interface/http/shared';
import { PaginationQueryDto } from 'src/interface/http/responses/common.query.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { AdminSellersRoleService } from './admin.sellers.role.service';
import { SellerPreviewResponseDto, SellerFullResponseDto } from './admin.sellers.response.dtos';
import { UpdateSellerByAdminDto, BlockSellerDto } from './admin.sellers.request.dtos';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminSellersController {
  constructor(
    private readonly adminSellersRoleService: AdminSellersRoleService
  ) {}


  @ApiOperation({summary: 'Получает информацию всех продавцах с пагинацией'})
  @Get()
  getAllSellers(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SellerPreviewResponseDto>> {
    return this.adminSellersRoleService.getSellers(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'Получает информацию о продавце'})
  @Get(':sellerId')
  getCurrentSeller(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string
  ): Promise<SellerFullResponseDto> {
    return this.adminSellersRoleService.getSeller(authedAdmin, sellerId);
  }


  @ApiOperation({summary: 'Получает логи продавца'})
  @Get(':sellerId/logs')
  getSellerLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    return this.adminSellersRoleService.getSellerLogs(authedAdmin, sellerId, paginationQuery);
  }


  @ApiOperation({summary: 'Обновляет информацию о продавце'})
  @Patch(':sellerId')
  updateSeller(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
    @Body() dto: UpdateSellerByAdminDto
  ): Promise<SellerFullResponseDto> {
    return this.adminSellersRoleService.updateSeller(authedAdmin, sellerId, dto);
  }


  @ApiOperation({summary: 'Блокирует/разблокирует продавца'})
  @Patch(':sellerId/block')
  blockSeller(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
    @Body() dto: BlockSellerDto
  ): Promise<SellerFullResponseDto> {
    return this.adminSellersRoleService.blockSeller(authedAdmin, sellerId, dto);
  }
}