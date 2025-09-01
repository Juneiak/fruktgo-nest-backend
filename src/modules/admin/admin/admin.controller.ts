import { Controller, Get, UseGuards,  } from '@nestjs/common';
import { 
  SystemStatsResponseDto,
  UserToVerifyResponseDto
} from './admin.response.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/me')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({summary: 'Получить статистику'})
  @UserType('admin')
  @Get('/stats')
  async getStats(@GetUser() authedAdmin: AuthenticatedUser): Promise<SystemStatsResponseDto> {
    return this.adminService.getStats(authedAdmin);
  }
  
  @ApiOperation({summary: 'Получить список пользователей для проверки'})
  @UserType('admin')
  @Get('/users-to-verify')
  async getUsersToVerify(@GetUser() authedAdmin: AuthenticatedUser): Promise<UserToVerifyResponseDto[]> {
    return this.adminService.getUsersToVerify(authedAdmin);
  }
};
