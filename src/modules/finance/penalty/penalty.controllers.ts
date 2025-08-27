import { Body, Controller, Get, Post, Query, Param, Put, Patch } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import {
  PenaltyServiceForAdmin, 
  PenaltyServiceForSeller
} from './penalty.role-services';
import {
  CreatePenaltyDto,
  PenaltyFilterQueryDto,
  UpdatePenaltyDto, 
  ContestPenaltyDto,
  FinalizePenaltyDto} from './penalty.request.dtos';
import { PenaltyResponseDto } from './penalty.response.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/account/penalties')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class PenaltyControllerForSeller {
  constructor(private readonly penaltyServiceForSeller: PenaltyServiceForSeller) {}

  @ApiOperation({summary: 'Получить штраф'})
  @ApiOkResponse({type: PenaltyResponseDto})
  @Get('/:penaltyId')
  getPenalty(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyServiceForSeller.getPenalty(authedSeller, penaltyId);
  }

  @ApiOperation({summary: 'Получить штрафы'})
  @ApiOkResponse({type: PenaltyResponseDto})
  @Get('/')
  getPenalties(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() filterQuery?: PenaltyFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PenaltyResponseDto>> {
    return this.penaltyServiceForSeller.getPenalties(authedSeller, filterQuery, paginationQuery);
  }

  @ApiOperation({summary: 'Обжаловать штраф'})
  @ApiOkResponse({type: PenaltyResponseDto})
  @Patch('/:penaltyId')
  contestPenalty(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
    @Body() contestPenaltyDto: ContestPenaltyDto,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyServiceForSeller.contestPenalty(authedSeller, penaltyId, contestPenaltyDto);
  }
}




@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/penalties')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class PenaltyControllerForAdmin {
  constructor(private readonly penaltyServiceForAdmin: PenaltyServiceForAdmin) {}

  @ApiOperation({summary: 'Создать штраф'})
  @ApiOkResponse({type: PenaltyResponseDto})
  @Post('/')
  createPenalty(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Body() createPenaltyDto: CreatePenaltyDto,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyServiceForAdmin.createPenalty(authedAdmin, createPenaltyDto);
  }


  @ApiOperation({summary: 'Получить штрафы'})
  @ApiOkResponse({type: PenaltyResponseDto})
  @Get('/')
  getPenalties(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() filterQuery?: PenaltyFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PenaltyResponseDto>> {
    return this.penaltyServiceForAdmin.getPenalties(authedAdmin, filterQuery, paginationQuery);
  }

  @ApiOperation({summary: 'Получить штраф'})
  @ApiOkResponse({type: PenaltyResponseDto})
  @Get('/:penaltyId')
  getPenalty(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyServiceForAdmin.getPenalty(authedAdmin, penaltyId);
  }

  @ApiOperation({summary: 'Обновить штраф'})
  @ApiOkResponse({type: PenaltyResponseDto})
  @Patch('/:penaltyId')
  updatePenalty(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
    @Body() updatePenaltyDto: UpdatePenaltyDto,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyServiceForAdmin.updatePenalty(authedAdmin, penaltyId, updatePenaltyDto);
  }

  @ApiOperation({summary: 'утвердить штраф'})
  @ApiOkResponse({type: PenaltyResponseDto})
  @Patch('/:penaltyId/finalize-penalty')
  finalizePenalty(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
    @Body() finalizePenaltyDto: FinalizePenaltyDto,
  ): Promise<PenaltyResponseDto> {
    return this.penaltyServiceForAdmin.finalizePenalty(authedAdmin, penaltyId, finalizePenaltyDto);
  }


}
