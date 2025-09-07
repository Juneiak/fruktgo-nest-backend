import { Controller, Get, Post, Body, Param, Patch, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { ShopSellerService } from './shop.seller.service';
import { 
  CreateShopDto,
  UpdateShopDto,
} from './shop.seller.request.dto';
import { ShopPreviewResponseDto, ShopFullResponseDto } from './shop.seller.response.dto';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/shops')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class ShopSellerController {
  constructor(
    private readonly shopSellerService: ShopSellerService,
  ) {}

  @ApiOperation({summary: 'Возвращает список превью информации о магазинах'})
  @Get('/')
  getShops(
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<ShopPreviewResponseDto[]> {
    return this.shopSellerService.getShops(authedSeller);
  }
  

  @ApiOperation({summary: 'возвращает полную информацию о магазине'})
  @Get('/:shopId')
  getShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId')shopId: string
  ): Promise<ShopFullResponseDto> {
    return this.shopSellerService.getFullShop(authedSeller, shopId);
  }


  @ApiOperation({summary: 'создание магазина продавцом'})
  @Post('/')
  @UseInterceptors(ImageUploadInterceptor('shopImage'))
  createShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: CreateShopDto,
    @UploadedFile() shopImage?: Express.Multer.File
  ): Promise<ShopPreviewResponseDto> {
    return this.shopSellerService.createShop(authedSeller, dto, shopImage);
  }


  @ApiOperation({summary: 'редактирует информацию о магазине'})
  @Patch('/:shopId')
  @UseInterceptors(ImageUploadInterceptor('shopImage'))
  updateShop(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Param('shopId') shopId: string, 
    @Body() dto: UpdateShopDto,
    @UploadedFile() shopImage?: Express.Multer.File
  ): Promise<ShopFullResponseDto> {
    return this.shopSellerService.updateShop(authedSeller, shopId, dto, shopImage);
  }



}
