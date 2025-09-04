import { Body, Controller, Get, Post, Query, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { PenaltyAdminService } from './penalty.admin.service';
import {
  CreatePenaltyDto,
  UpdatePenaltyDto, 
  FinalizePenaltyDto
} from './penalty.admin.request.dto';
import { PenaltyResponseDto } from './penalty.admin.response.dto';
import { PenaltyFilterQueryDto } from './penalty.admin.filter.dto';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/penalties')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class PenaltyAdminController {
  constructor(private readonly penaltyAdminService: PenaltyAdminService) {}

  @ApiOperation({summary: 'Создать штраф'})
  @Post('/')
  createPenalty(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Body() createPenaltyDto: CreatePenaltyDto,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyAdminService.createPenalty(authedAdmin, createPenaltyDto);
  }


  @ApiOperation({summary: 'Получить штрафы'})
  @Get('/')
  getPenalties(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() filterQuery?: PenaltyFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PenaltyResponseDto>> {
    return this.penaltyAdminService.getPenalties(authedAdmin, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Получить штраф'})
  @Get('/:penaltyId')
  getPenalty(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyAdminService.getPenalty(authedAdmin, penaltyId);
  }


  @ApiOperation({summary: 'Обновить штраф'})
  @Patch('/:penaltyId')
  updatePenalty(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
    @Body() updatePenaltyDto: UpdatePenaltyDto,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyAdminService.updatePenalty(authedAdmin, penaltyId, updatePenaltyDto);
  }


  @ApiOperation({summary: 'утвердить штраф'})
  @Patch('/:penaltyId/finalize-penalty')
  finalizePenalty(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
    @Body() finalizePenaltyDto: FinalizePenaltyDto,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyAdminService.finalizePenalty(authedAdmin, penaltyId, finalizePenaltyDto);
  }
}
