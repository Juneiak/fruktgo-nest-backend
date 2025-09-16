import { Controller, Get, Param, UseGuards, Query, Patch } from '@nestjs/common';
import { ShiftAdminService } from './shift.admin.service';
import { ShiftResponseDto } from './shift.admin.response.dtos';
import { ShiftFilterQuery } from './shift.admin.filter.dtos';
import { ApiTags, ApiOperation, ApiBearerAuth} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/shifts')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class ShiftAdminController {
  constructor(private readonly shiftAdminService: ShiftAdminService) {}

  @ApiOperation({summary: 'Получает превью смен с пагинацией'})
  @Get('/')
  getShifts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() shiftFilterQuery: ShiftFilterQuery,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    return this.shiftAdminService.getShifts(authedAdmin, shiftFilterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Получает полную информацию о смене'})
  @Get('/:shiftId')
  getShopShift(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftResponseDto> {
    return this.shiftAdminService.getShift(authedAdmin, shiftId);
  }


  @ApiOperation({summary: 'Получает логи смены'})
  @Get('/:shiftId/logs')
  getShiftLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedLogDto> {
    return this.shiftAdminService.getShiftLogs(authedAdmin, shiftId, paginationQuery);
  }


  @ApiOperation({summary: 'закрывает смену принудительно'})
  @Patch('/:shiftId')
  forceCloseShift(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftResponseDto> {
    return this.shiftAdminService.forceCloseShift(authedAdmin, shiftId);
  }
}
