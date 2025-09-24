import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoginCodeResponseDto, AdminAuthResponseDto } from './admin.auth.response.dtos';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { AdminAuthRoleService } from './admin.auth.role.service';

@Controller('')
export class AdminAuthController {
  constructor(private readonly adminAuthRoleService: AdminAuthRoleService) {}

  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа администратора'})
  @Get('auth/admin/login-code')
  getLoginCodeForAdmin(): Promise<LoginCodeResponseDto> {
    return this.adminAuthRoleService.generateLoginCode();
  }

  @ApiTags('for admin')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего администратора'})
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('auth/admin/me')
  getAdminProfile(
    @GetUser() authedAdmin: AuthenticatedUser
  ): Promise<AdminAuthResponseDto> {
    return this.adminAuthRoleService.checkAuth(authedAdmin);
  }
}
