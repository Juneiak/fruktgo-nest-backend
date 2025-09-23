import { Controller, Get, Body, Patch, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { SellerMeRoleService } from './seller.me.role.service'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { SellerFullResponseDto, SellerPreviewResponseDto } from './seller.me.response.dtos';
import { UpdateSellerDto } from './seller.me.request.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/me')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerMeController {
  constructor(
    private readonly sellerMeRoleService: SellerMeRoleService,
  ) {}

  @ApiOperation({summary: 'Получает полную информацию о продавце'})
  @Get('')
  getSeller(
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<SellerFullResponseDto> {
    return this.sellerMeRoleService.getFullSeller(authedSeller);
  }


  @ApiOperation({summary: 'Получает краткую информацию о продавце'})
  @Get('preview')
  getSellerPreview(
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<SellerPreviewResponseDto> {
    return this.sellerMeRoleService.getPreviewSeller(authedSeller);
  }


  @ApiOperation({summary: 'редактирует информацию о продавце'})
  @Patch()
  @UseInterceptors(ImageUploadInterceptor('sellerLogo'))
  updateSeller(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: UpdateSellerDto,
    @UploadedFile() sellerLogo?: Express.Multer.File
  ): Promise<SellerFullResponseDto> {
    return this.sellerMeRoleService.updateSeller(authedSeller, dto, sellerLogo);
  }
}
