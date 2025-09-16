import { Body, Controller, Get, Post, Query, Param, Put, Patch } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { PenaltySellerService } from './penalty.seller.service';
import { PenaltyFilterQueryDto, ContestPenaltyDto } from './penalty.seller.request.dtos';
import { PenaltyResponseDto } from './penalty.seller.response.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/account/penalties')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class PenaltySellerController {
  constructor(private readonly penaltySellerService: PenaltySellerService) {}

  @ApiOperation({summary: 'Получить штраф'})
  @Get('/:penaltyId')
  getPenalty(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
  ): Promise<PenaltyResponseDto> {
    return this.penaltySellerService.getPenalty(authedSeller, penaltyId);
  }


  @ApiOperation({summary: 'Получить штрафы'})
  @Get('/')
  getPenalties(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() filterQuery?: PenaltyFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PenaltyResponseDto>> {
    return this.penaltySellerService.getPenalties(authedSeller, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Обжаловать штраф'})
  @Patch('/:penaltyId')
  contestPenalty(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('penaltyId') penaltyId: string,
    @Body() contestPenaltyDto: ContestPenaltyDto,
  ): Promise<PenaltyResponseDto> {
    return this.penaltySellerService.contestPenalty(authedSeller, penaltyId, contestPenaltyDto);
  }
}
