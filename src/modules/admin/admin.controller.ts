import { Controller, Get, UseGuards,  } from '@nestjs/common';
import { 
  AdminResponseDto,
  SystemStatsToAdminResponseDto,
  UserToVerifyToAdminResponseDto
} from './admin.dtos';
import { ApiBearerAuth, ApiTags, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Admin } from './admin.schema';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';

@ApiTags('test')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}


  @Get('/')
  async getAdmins(): Promise<Admin[]> {
    return this.adminService.getAdmins();
  }

  @ApiTags('for admin')
  @ApiOperation({summary: 'Получить статистику'})
  @ApiOkResponse({type: SystemStatsToAdminResponseDto})
  // ====================================================
  @UserType('admin')
  @Get('/stats')
  async getStats(@GetUser() authedAdmin: AuthenticatedUser): Promise<SystemStatsToAdminResponseDto> {
    return this.adminService.getStats(authedAdmin);
  }
  
  @ApiTags('for admin')
  @ApiOperation({summary: 'Получить список пользователей для проверки'})
  @ApiOkResponse({type: UserToVerifyToAdminResponseDto, isArray: true})
  // ====================================================
  @UserType('admin')
  @Get('/users-to-verify')
  async getUsersToVerify(@GetUser() authedAdmin: AuthenticatedUser): Promise<UserToVerifyToAdminResponseDto[]> {
    return this.adminService.getUsersToVerify(authedAdmin);
  }
  
}
