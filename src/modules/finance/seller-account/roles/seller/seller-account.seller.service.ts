import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SellerAccountService } from '../seller-account.service';
import { AuthenticatedUser } from 'src/common/types';
import { 
  CreateWithdrawalRequestDto, 
  WithdrawalRequestFilterQueryDto,
  UpdateBankDetailsDto,
} from './seller-account.seller.request.dtos';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { SellerAccountResponseDto, WithdrawalRequestResponseDto } from './seller-account.seller.response.dtos';
import { plainToInstance } from 'class-transformer';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SellerAccount } from '../schemas/seller-account.schema';

@Injectable()
export class SellerAccountSellerService {
  constructor(
    @InjectModel('SellerAccount') private sellerAccountModel: Model<SellerAccount>,
    private sellerAccountService: SellerAccountService,
  ) {}

  async getSellerAccount(authedSeller: AuthenticatedUser): Promise<SellerAccountResponseDto> {
    const sellerAccount = await this.sellerAccountService.getSellerAccount(authedSeller.id);

    return plainToInstance(SellerAccountResponseDto, sellerAccount, { excludeExtraneousValues: true });
  }


  async getWithdrawalRequests(
    authedSeller: AuthenticatedUser,
    filterQuery?: WithdrawalRequestFilterQueryDto,
    paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WithdrawalRequestResponseDto>> {
    const filterQueryForSeller = {
      ...filterQuery,
      ofSellerId: authedSeller.id,
    };
    const { requests, pagination } = await this.sellerAccountService.getWithdrawalRequests(filterQueryForSeller, paginationQuery);
    
    // Преобразуем документы в DTO
    const items = plainToInstance(WithdrawalRequestResponseDto, requests, { excludeExtraneousValues: true });
    return { items, pagination };
  }


  async createWithdrawalRequest(
    authedSeller: AuthenticatedUser,
    createWithdrawalRequestDto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestResponseDto> {
    
    const withdrawalRequest = await this.sellerAccountService.createWithdrawalRequest(authedSeller.id, createWithdrawalRequestDto);
    return plainToInstance(WithdrawalRequestResponseDto, withdrawalRequest, { excludeExtraneousValues: true });
  }


  async getWithdrawalRequest(
    authedSeller: AuthenticatedUser,
    withdrawalRequestId: string,
  ): Promise<WithdrawalRequestResponseDto> {
    const sellerAccount = await this.sellerAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!sellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    const withdrawalRequest = await this.sellerAccountService.getWithdrawalRequest(withdrawalRequestId);

    if (withdrawalRequest.sellerAccount.toString() !== sellerAccount._id.toString()) throw new ForbiddenException('нет доступа к заявке');
    
    return plainToInstance(WithdrawalRequestResponseDto, withdrawalRequest, { excludeExtraneousValues: true });
  }


  async updateBankDetails(
    authedSeller: AuthenticatedUser,
    updateBankDetailsDto: UpdateBankDetailsDto,
  ): Promise<SellerAccountResponseDto> {
    const sellerAccount = await this.sellerAccountModel.findOne({seller: new Types.ObjectId(authedSeller.id)}).select('_id').lean({ virtuals: true }).exec();
    if (!sellerAccount) throw new NotFoundException('Аккаунт продавца не найден');

    const updatedSellerAccount = await this.sellerAccountService.updateBankDetails(sellerAccount._id.toString(), updateBankDetailsDto);

    return plainToInstance(SellerAccountResponseDto, updatedSellerAccount, { excludeExtraneousValues: true });
  }
}
