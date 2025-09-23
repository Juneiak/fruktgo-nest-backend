import { Controller, Get, UseGuards,  } from '@nestjs/common';
import { 
  SystemStatsResponseDto,
  UserToVerifyResponseDto
} from './admin.platform.response.dtos';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminPlatformRoleService } from './admin.platform.role.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminPlatformController {
  constructor(private readonly adminPlatformRoleService: AdminPlatformRoleService) {}

  @ApiOperation({summary: 'Получить статистику'})
  @UserType('admin')
  @Get('stats')
  async getStats(@GetUser() authedAdmin: AuthenticatedUser): Promise<SystemStatsResponseDto> {
    return this.adminPlatformRoleService.getStats(authedAdmin);
  }
  
  
  @ApiOperation({summary: 'Получить список пользователей для проверки'})
  @UserType('admin')
  @Get('users-to-verify')
  async getUsersToVerify(@GetUser() authedAdmin: AuthenticatedUser): Promise<UserToVerifyResponseDto[]> {
    return this.adminPlatformRoleService.getUsersToVerify(authedAdmin);
  }
};
