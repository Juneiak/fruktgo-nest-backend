import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ShiftSellerService } from './shift.seller.service';
import { PaginationQueryDto, PaginatedResponseDto } from "src/common/dtos";
import { ShiftResponseDto } from './shift.seller.response.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import { ShiftFilterDto } from './shift.seller.filter.dtos';

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
  @Get('/')
  getShiftsOfShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() shiftFilterDto: ShiftFilterDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    return this.shiftSellerService.getShiftsOfShop(authedSeller, shiftFilterDto, paginationQuery);
  }


  @ApiOperation({summary: 'Возвращает последнюю смену'})
  @Get('/shifts/current')
  getCurrentShiftOfShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() shiftFilterDto: ShiftFilterDto,
  ): Promise<ShiftResponseDto> {
    return this.shiftSellerService.getCurrentShiftOfShop(authedSeller, shiftFilterDto);
  }


  @ApiOperation({summary: 'Возвращает смену'})
  @Get('/:shiftId')
  getShift(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftResponseDto> {
    return this.shiftSellerService.getShift(authedSeller, shiftId);
  }


  @ApiOperation({summary: 'Возвращает логи смены'})
  @Get('/:shiftId/logs')
  getShiftLogs(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shiftSellerService.getShiftLogs(authedSeller, shiftId, paginationQuery);
  }
}
