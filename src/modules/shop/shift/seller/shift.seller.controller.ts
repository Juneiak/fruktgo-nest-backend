import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ShiftSellerService } from './shift.seller.service';
import { PaginationQueryDto, PaginationMetaDto, PaginatedResponseDto } from "src/common/dtos";
import { 
  ShiftPreviewResponseDto,
  ShiftFullResponseDto,
} from './shift.seller.response.dto';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/shifts')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class ShiftSellerController {
  constructor(
    private readonly shiftSellerService: ShiftSellerService,
  ) {}

  @ApiOperation({summary: 'Возвращает список смен с пагинацией'})
  @Get('/:shopId/shifts')
  getShifts(
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    return this.shiftSellerService.getShifts(authedSeller, shopId, paginationQuery);
  }


  @ApiOperation({summary: 'Возвращает последнюю смену'})
  @Get('/:shopId/shifts/current')
  getCurrentShift(
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<ShiftFullResponseDto> {
    return this.shiftSellerService.getCurrentShift(authedSeller, shopId);
  }


  @ApiOperation({summary: 'Возвращает смену'})
  @Get('/:shopId/shifts/:shiftId')
  getShift(
    @Param('shiftId') shiftId: string,
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<ShiftFullResponseDto> {
    return this.shiftSellerService.getShift(authedSeller, shopId, shiftId);
  }


  @ApiOperation({summary: 'Возвращает логи смены'})
  @Get('/:shopId/shifts/:shiftId/logs')
  getShiftLogs(
    @Param('shiftId') shiftId: string,
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shiftSellerService.getShiftLogs(authedSeller, shopId, shiftId, paginationQuery);
  }
}
