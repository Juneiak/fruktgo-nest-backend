import { Controller, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { LoginCodeResponseDto, AdminAuthResponseDto } from './admin-auth.response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';

@Controller('')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа администратора'})
  @Get('auth/admin/login-code')
  getLoginCodeForAdmin(): Promise<LoginCodeResponseDto> {
    return this.adminAuthService.generateLoginCode();
  }

  @ApiTags('for admin')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего администратора'})
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('auth/admin/me')
  getAdminProfile(
    @GetUser() authedAdmin: AuthenticatedUser
  ): Promise<AdminAuthResponseDto> {
    return this.adminAuthService.checkAuth(authedAdmin);
  }
}
