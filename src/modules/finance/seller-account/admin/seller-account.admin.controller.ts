import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { SellerAccountResponseDto } from './seller-account.admin.response.dtos';
import { SellerAccountAdminService } from './seller-account.admin.service';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/sellers/:sellerId/account')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class SellerAccountAdminController {
  constructor(private readonly sellerAccountAdminService: SellerAccountAdminService) {}

  @ApiOperation({summary: 'Получить аккаунт продовца'})
  @Get('/')
  getSellerAccount(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
  ): Promise<SellerAccountResponseDto> {
    return this.sellerAccountAdminService.getSellerAccount(authedAdmin, sellerId);
  }
}
