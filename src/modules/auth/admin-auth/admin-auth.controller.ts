import { Controller, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { LoginCodeForAdminDto, AdminAuthDto } from './admin-auth.dtos';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';

@Controller('')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа администратора'})
  @ApiOkResponse({type: LoginCodeForAdminDto})
  // ====================================================
  @Get('auth/admin/login-code')
  getLoginCodeForAdmin(): Promise<LoginCodeForAdminDto> {
    return this.adminAuthService.generateLoginCode();
  }

  @ApiTags('for admin')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего администратора'})
  @ApiOkResponse({type: AdminAuthDto})
  @ApiBearerAuth()
  // ====================================================
  @UseGuards(JwtAuthGuard)
  @Get('auth/admin/me')
  getAdminProfile(@GetUser() authedAdmin: AuthenticatedUser): Promise<AdminAuthDto> {
    return this.adminAuthService.checkAuth(authedAdmin);
  }
}
