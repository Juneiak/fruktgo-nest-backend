import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/common/types';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { plainToInstance } from 'class-transformer';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Penalty } from './penalty.schema';
import { ShopAccount } from 'src/modules/finance/shop-account/schemas/shop-account.schema';
import { PenaltyService } from './penalty.service';
import { PenaltyResponseDto } from './penalty.response.dtos';
import { PenaltyFilterQueryDto, UpdatePenaltyDto, ContestPenaltyDto, CreatePenaltyDto, FinalizePenaltyDto } from './penalty.request.dtos';

@Injectable()
export class PenaltyServiceForSeller {
  constructor(
    @InjectModel('Penalty') private penaltyModel: Model<Penalty>,
    @InjectModel('ShopAccount') private shopAccountModel: Model<ShopAccount>,
    private penaltyService: PenaltyService,
  ) {}

  async getPenalty(authedSeller: AuthenticatedUser, penaltyId: string): Promise<PenaltyResponseDto> {
    
    const foundSellerAccount = await this.shopAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!foundSellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    
    const findedPenalty = await this.penaltyService.getPenalty(penaltyId);
    
    if (findedPenalty.shopAccount.toString() !== foundSellerAccount._id.toString()) throw new ForbiddenException('нет доступа к штрафу');
    
    return plainToInstance(PenaltyResponseDto, findedPenalty, { groups: ['seller'], excludeExtraneousValues: true });
  }


  async getPenalties(authedSeller: AuthenticatedUser, filterQuery?: PenaltyFilterQueryDto, paginationQuery?: PaginationQueryDto): Promise<PaginatedResponseDto<PenaltyResponseDto>> {
    const foundSellerAccount = await this.shopAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!foundSellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    
    filterQuery = {
      ...filterQuery,
      shopAccountId: foundSellerAccount._id.toString(),
    };
    
    const findedPenalties = await this.penaltyService.getPenalties(filterQuery, paginationQuery);
    
    return plainToInstance(PaginatedResponseDto<PenaltyResponseDto>, findedPenalties, { groups: ['seller'], excludeExtraneousValues: true });
  }


  async contestPenalty(authedSeller: AuthenticatedUser, penaltyId: string, contestPenaltyDto: ContestPenaltyDto): Promise<PenaltyResponseDto> {
    const foundSellerAccount = await this.shopAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!foundSellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    const findedPenalty = await this.penaltyService.contestPenalty(penaltyId, contestPenaltyDto);
    if (findedPenalty.shopAccount.toString() !== foundSellerAccount._id.toString()) throw new ForbiddenException('нет доступа к штрафу');

    
    return plainToInstance(PenaltyResponseDto, findedPenalty, { groups: ['seller'], excludeExtraneousValues: true });
  }
}



@Injectable()
export class PenaltyServiceForAdmin {
  constructor(
    private penaltyService: PenaltyService,
  ) {}

  async createPenalty(authedAdmin: AuthenticatedUser, createPenaltyDto: CreatePenaltyDto): Promise<PenaltyResponseDto> {
    const createdPenalty = await this.penaltyService.createPenalty(createPenaltyDto);
    return plainToInstance(PenaltyResponseDto, createdPenalty, { groups: ['admin'], excludeExtraneousValues: true });
  }

  async getPenalty(authedAdmin: AuthenticatedUser, penaltyId: string): Promise<PenaltyResponseDto> {
    const findedPenalty = await this.penaltyService.getPenalty(penaltyId);
    return plainToInstance(PenaltyResponseDto, findedPenalty, { groups: ['admin'], excludeExtraneousValues: true });
  }


  async getPenalties(authedAdmin: AuthenticatedUser, filterQuery?: PenaltyFilterQueryDto, paginationQuery?: PaginationQueryDto): Promise<PaginatedResponseDto<PenaltyResponseDto>> {
    const findedPenalties = await this.penaltyService.getPenalties(filterQuery, paginationQuery);
    return plainToInstance(PaginatedResponseDto<PenaltyResponseDto>, findedPenalties, { groups: ['admin'], excludeExtraneousValues: true });
  }


  async updatePenalty(authedAdmin: AuthenticatedUser, penaltyId: string, updatePenaltyDto: UpdatePenaltyDto): Promise<PenaltyResponseDto> {
    const updatedPenalty = await this.penaltyService.updatePenalty(penaltyId, updatePenaltyDto);
    return plainToInstance(PenaltyResponseDto, updatedPenalty, { groups: ['admin'], excludeExtraneousValues: true });
  }


  async finalizePenalty(authedAdmin: AuthenticatedUser, penaltyId: string, finalizePenaltyDto: FinalizePenaltyDto): Promise<PenaltyResponseDto> {
    const updatedPenalty = await this.penaltyService.finalizePenalty(penaltyId, finalizePenaltyDto);
    return plainToInstance(PenaltyResponseDto, updatedPenalty, { groups: ['admin'], excludeExtraneousValues: true });
  }


}