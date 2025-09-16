import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from 'src/common/types';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { plainToInstance } from 'class-transformer';
import { PenaltyService } from '../penalty.service';
import { PenaltyResponseDto } from './penalty.admin.response.dtos';
import {
  UpdatePenaltyDto,
  CreatePenaltyDto,
  FinalizePenaltyDto
} from './penalty.admin.request.dtos';
import { PenaltyFilterQueryDto } from './penalty.admin.filter.dtos';


@Injectable()
export class PenaltyAdminService {
  constructor(
    private penaltyService: PenaltyService,
  ) {}

  async createPenalty(authedAdmin: AuthenticatedUser, createPenaltyDto: CreatePenaltyDto): Promise<PenaltyResponseDto> {
    const createdPenalty = await this.penaltyService.createPenalty(createPenaltyDto);
    return plainToInstance(PenaltyResponseDto, createdPenalty, { excludeExtraneousValues: true });
  }
  

  async getPenalty(authedAdmin: AuthenticatedUser, penaltyId: string): Promise<PenaltyResponseDto> {
    const findedPenalty = await this.penaltyService.getPenalty(penaltyId);
    return plainToInstance(PenaltyResponseDto, findedPenalty, { excludeExtraneousValues: true });
  }


  async getPenalties(authedAdmin: AuthenticatedUser, filterQuery?: PenaltyFilterQueryDto, paginationQuery?: PaginationQueryDto): Promise<PaginatedResponseDto<PenaltyResponseDto>> {
    const findedPenalties = await this.penaltyService.getPenalties(filterQuery, paginationQuery);
    return plainToInstance(PaginatedResponseDto<PenaltyResponseDto>, findedPenalties, { excludeExtraneousValues: true });
  }


  async updatePenalty(authedAdmin: AuthenticatedUser, penaltyId: string, updatePenaltyDto: UpdatePenaltyDto): Promise<PenaltyResponseDto> {
    const updatedPenalty = await this.penaltyService.updatePenalty(penaltyId, updatePenaltyDto);
    return plainToInstance(PenaltyResponseDto, updatedPenalty, { excludeExtraneousValues: true });
  }


  async finalizePenalty(authedAdmin: AuthenticatedUser, penaltyId: string, finalizePenaltyDto: FinalizePenaltyDto): Promise<PenaltyResponseDto> {
    const updatedPenalty = await this.penaltyService.finalizePenalty(penaltyId, finalizePenaltyDto);
    return plainToInstance(PenaltyResponseDto, updatedPenalty, { excludeExtraneousValues: true });
  }


}