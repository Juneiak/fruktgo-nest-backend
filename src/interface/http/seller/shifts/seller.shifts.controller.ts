import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SellerShiftsRoleService } from './seller.shifts.role.service';
import { PaginatedResponseDto } from "src/interface/http/common/common.response.dtos";
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { ShiftResponseDto } from './seller.shifts.response.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dto';
import { ShiftsQueryDto } from './seller.shifts.query.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerShiftsController {
  constructor(
    private readonly sellerShiftsRoleService: SellerShiftsRoleService,
  ) {}

  @ApiOperation({summary: 'Возвращает список смен с пагинацией'})
  @Get()
  getShiftsOfShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() shiftsQueryDto: ShiftsQueryDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftResponseDto>> {
    return this.sellerShiftsRoleService.getShiftsOfShop(authedSeller, shiftsQueryDto, paginationQuery);
  }


  @ApiOperation({summary: 'Возвращает последнюю смену'})
  @Get('shifts/current')
  getCurrentShiftOfShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() shiftsQueryDto: ShiftsQueryDto,
  ): Promise<ShiftResponseDto> {
    return this.sellerShiftsRoleService.getCurrentShiftOfShop(authedSeller, shiftsQueryDto);
  }


  @ApiOperation({summary: 'Возвращает смену'})
  @Get(':shiftId')
  getShift(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
  ): Promise<ShiftResponseDto> {
    return this.sellerShiftsRoleService.getShift(authedSeller, shiftId);
  }


  @ApiOperation({summary: 'Возвращает логи смены'})
  @Get(':shiftId/logs')
  getShiftLogs(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shiftId') shiftId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.sellerShiftsRoleService.getShiftLogs(authedSeller, shiftId, paginationQuery);
  }
}
