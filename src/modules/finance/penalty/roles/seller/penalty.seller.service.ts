import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from 'src/common/types';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { plainToInstance } from 'class-transformer';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Penalty } from '../penalty.schema';
import { ShopAccount } from 'src/modules/finance/shop-account/schemas/shop-account.schema';
import { PenaltyService } from '../penalty.service';
import { PenaltyResponseDto } from './penalty.seller.response.dtos';
import { PenaltyFilterQueryDto, ContestPenaltyDto } from './penalty.seller.request.dtos';

@Injectable()
export class PenaltySellerService {
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
    
    return plainToInstance(PenaltyResponseDto, findedPenalty, { excludeExtraneousValues: true });
  }


  async getPenalties(authedSeller: AuthenticatedUser, filterQuery?: PenaltyFilterQueryDto, paginationQuery?: PaginationQueryDto): Promise<PaginatedResponseDto<PenaltyResponseDto>> {
    const foundSellerAccount = await this.shopAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!foundSellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    
    filterQuery = {
      ...filterQuery,
      shopAccountId: foundSellerAccount._id.toString(),
    };
    
    const findedPenalties = await this.penaltyService.getPenalties(filterQuery, paginationQuery);
    
    return plainToInstance(PaginatedResponseDto<PenaltyResponseDto>, findedPenalties, { excludeExtraneousValues: true });
  }


  async contestPenalty(authedSeller: AuthenticatedUser, penaltyId: string, contestPenaltyDto: ContestPenaltyDto): Promise<PenaltyResponseDto> {
    const foundSellerAccount = await this.shopAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!foundSellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    const findedPenalty = await this.penaltyService.contestPenalty(penaltyId, contestPenaltyDto);
    if (findedPenalty.shopAccount.toString() !== foundSellerAccount._id.toString()) throw new ForbiddenException('нет доступа к штрафу');

    
    return plainToInstance(PenaltyResponseDto, findedPenalty, { excludeExtraneousValues: true });
  }
}
