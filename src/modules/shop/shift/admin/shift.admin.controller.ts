import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ShiftAdminService } from './shift.admin.service';
import {
  ShiftPreviewResponseDto,
  ShiftFullResponseDto,
} from './shift.admin.response.dto';
import { ShiftFilterQuery } from './shift.admin.filter.dto';
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
  @Get('/shifts')
  getShifts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query() shiftFilterQuery: ShiftFilterQuery
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    return this.shiftAdminService.getShifts(authedAdmin, paginationQuery, shiftFilterQuery);
  }


  @ApiOperation({summary: 'Получает логи смены'})
  @Get('/shifts/:shiftId/logs')
  getShiftLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedLogDto> {
    return this.shiftAdminService.getShiftLogs(authedAdmin, shiftId, paginationQuery);
  }


  @ApiOperation({summary: 'Получает превью смен магазина с пагинацией'})
  @Get('/:shopId/shifts')
  getShopShifts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    return this.shiftAdminService.getShopShifts(authedAdmin, shopId, paginationQuery);
  }


  @ApiOperation({summary: 'Получает полную информацию о смене'})
  @Get('/shifts/:shiftId')
  getShopShift(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftFullResponseDto> {
    return this.shiftAdminService.getShopShift(authedAdmin, shiftId);
  }


  @ApiOperation({summary: 'Получает логи смены'})
  @Get('/:shopId/shifts/:shiftId/logs')
  getShopShiftLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('shiftId') shiftId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shiftAdminService.getShopShiftLogs(authedAdmin, shopId, shiftId, paginationQuery);
  }
}
