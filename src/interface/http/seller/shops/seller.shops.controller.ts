import { Controller, Get, Post, Body, Param, Patch, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { SellerShopsRoleService } from './seller.shops.role.service'
import { 
  CreateShopDto,
  UpdateShopDto,
} from './seller.shops.request.dtos';
import { ShopPreviewResponseDto, ShopFullResponseDto } from './seller.shops.response.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerShopsController {
  constructor(
    private readonly sellerShopsRoleService: SellerShopsRoleService,
  ) {}

  @ApiOperation({summary: 'Возвращает список превью информации о магазинах'})
  @Get()
  getShops(
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<ShopPreviewResponseDto[]> {
    return this.sellerShopsRoleService.getShops(authedSeller);
  }
  

  @ApiOperation({summary: 'возвращает полную информацию о магазине'})
  @Get(':shopId')
  getShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId')shopId: string
  ): Promise<ShopFullResponseDto> {
    return this.sellerShopsRoleService.getFullShop(authedSeller, shopId);
  }


  @ApiOperation({summary: 'создание магазина продавцом'})
  @Post()
  @UseInterceptors(ImageUploadInterceptor('shopImage'))
  createShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: CreateShopDto,
    @UploadedFile() shopImage?: Express.Multer.File
  ): Promise<ShopPreviewResponseDto> {
    return this.sellerShopsRoleService.createShop(authedSeller, dto, shopImage);
  }


  @ApiOperation({summary: 'редактирует информацию о магазине'})
  @Patch(':shopId')
  @UseInterceptors(ImageUploadInterceptor('shopImage'))
  updateShop(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Param('shopId') shopId: string, 
    @Body() dto: UpdateShopDto,
    @UploadedFile() shopImage?: Express.Multer.File
  ): Promise<ShopFullResponseDto> {
    return this.sellerShopsRoleService.updateShop(authedSeller, shopId, dto, shopImage);
  }
}
