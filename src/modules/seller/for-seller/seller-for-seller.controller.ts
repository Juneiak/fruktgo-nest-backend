import { Controller, Get, Body, Delete, Post, Patch, UseGuards, Param, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { SellerForSellerService } from './seller-for-seller.service'
import { ApiBearerAuth, ApiTags, ApiOkResponse, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { SellerForSellerFullResponseDto, SellerForSellerPreviewResponseDto, UpdateSellerForSellerDto } from './seller-for-seller.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { ApiFormData } from 'src/common/swagger/api-form-data.decorator';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('sellers/for-seller')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerForSellerController {
  constructor(
    private readonly sellerForSellerService: SellerForSellerService,
  ) {}


  // ====================================================
  // SELLER CRUD
  // ====================================================
  @ApiOperation({summary: 'Получает полную информацию о продавце'})
  @ApiOkResponse({type: SellerForSellerFullResponseDto})
  // ====================================================
  @Get('me')
  getSeller(
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<SellerForSellerFullResponseDto> {
    return this.sellerForSellerService.getFullSeller(authedSeller);
  }

  @ApiOperation({summary: 'Получает краткую информацию о продавце'})
  @ApiOkResponse({type: SellerForSellerPreviewResponseDto})
  // ====================================================
  @Get('preview')
  getSellerPreview(
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<SellerForSellerPreviewResponseDto> {
    return this.sellerForSellerService.getPreviewSeller(authedSeller);
  }



  @ApiOperation({summary: 'редактирует информацию о продавце'})
  @ApiFormData('sellerLogo', true, UpdateSellerForSellerDto)
  @ApiOkResponse({type: SellerForSellerFullResponseDto})
  // ====================================================
  @Patch()
  @UseInterceptors(ImageUploadInterceptor('sellerLogo'))
  updateSeller(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: UpdateSellerForSellerDto,
    @UploadedFile() sellerLogo?: Express.Multer.File
  ): Promise<SellerForSellerFullResponseDto> {
    return this.sellerForSellerService.updateSeller(authedSeller, dto, sellerLogo);
  }

}
  